import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { Booking, Payment, NotificationItem } from '../types';
import { CalendarView } from '../components/CalendarView';
import { ChatWidget } from '../components/ChatWidget';
import { 
  BookOpen, 
  CreditCard, 
  Calendar, 
  MessageSquare, 
  Bell, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  XOctagon, 
  Hourglass,
  Sliders
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { currentUser, showToast, notifications, refreshNotifications, notificationSettings, updateNotificationSettings, classes, refreshClasses, refreshUserProfile } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'classes' | 'chat' | 'notifications'>('schedule');
  
  const [studentBookings, setStudentBookings] = useState<Booking[]>([]);
  const [paymentsList, setPaymentsList] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Fetch bookings matching studentId
      const allBookings = await firestoreService.getBookings();
      const matchedBookings = allBookings.filter(b => b.studentId === currentUser.uid);
      setStudentBookings(matchedBookings);

      // Fetch payments matching studentId
      const allPayments = await firestoreService.getPayments();
      const matchedPayments = allPayments.filter(p => p.studentId === currentUser.uid);
      setPaymentsList(matchedPayments);
    } catch (e) {
      console.warn("Failed retrieving student context ledger", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refreshUserProfile && currentUser) {
      refreshUserProfile().catch(console.warn);
    }
    fetchDashboardData();
    refreshClasses();
  }, [currentUser?.uid]);

  const handleCancelBooking = async (bookingId: string, classId: string) => {
    if (!window.confirm("Are you sure you want to cancel this tuition slot?")) return;
    try {
      await firestoreService.cancelBooking(bookingId, classId);
      
      // Trigger notification alert
      await firestoreService.triggerNotification(
        currentUser!.uid,
        "Tuition Class Cancelled",
        "Your booking slot has been successfully removed. Refund evaluation is on review.",
        "reminder"
      );
      
      showToast("Class booking cancelled successfully.", "info");
      await fetchDashboardData();
    } catch (e) {
      showToast("Failed booking cancellation.", "error");
    }
  };

  if (!currentUser) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-slate-50/40 min-h-screen py-10"
      id="student_workspace"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Workspace Title Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-indigo-650 uppercase tracking-widest block leading-none">Scholar Portal</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">Welcome Back, {currentUser.name}!</h1>
            <p className="text-xs text-slate-400 mt-1.5">Grade Level: <span className="font-extrabold text-indigo-600">{currentUser.studentDetails?.grade || 'Grade 11'}</span> • Access code: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">SYNCED_SCHOLAR</span></p>
          </div>

          {/* Sub menu controls */}
          <div className="flex flex-wrap gap-1 bg-white border border-slate-200/80 p-1.5 rounded-2xl text-xs font-bold text-slate-500 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <button
              onClick={() => setActiveSubTab('schedule')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'schedule' ? 'bg-slate-900 text-white font-extrabold' : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Calendar className="w-4 h-4 text-indigo-400" /> Calendar
            </button>
            <button
              onClick={() => setActiveSubTab('classes')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'classes' ? 'bg-slate-900 text-white font-extrabold' : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <BookOpen className="w-4 h-4 text-indigo-400" /> Classes & Ledger
            </button>
            <button
              onClick={() => setActiveSubTab('chat')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'chat' ? 'bg-slate-900 text-white font-extrabold' : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" /> Message Chat
            </button>
            <button
              onClick={() => setActiveSubTab('notifications')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 relative cursor-pointer ${activeSubTab === 'notifications' ? 'bg-slate-900 text-white font-extrabold' : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Bell className="w-4 h-4 text-indigo-400" /> Alerts
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="h-2 w-2 rounded-full bg-red-500 absolute top-1.5 right-1.5 animate-ping"></span>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Display boards */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Synchronizing student dashboard states...
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* 1. Schedule View Tab */}
            {activeSubTab === 'schedule' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <CalendarView 
                  userRole="student" 
                  userBookings={studentBookings} 
                />
              </motion.div>
            )}

            {/* 2. Enrolled Classes & Receipts List Tab */}
            {activeSubTab === 'classes' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                
                {/* Bookings left col */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                  
                  {/* Assigned Classes (My Courses) */}
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-150/50 space-y-3">
                    <h3 className="text-sm font-extrabold text-indigo-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" /> My Assigned Courses (Curriculums)
                    </h3>
                    
                    {(() => {
                      const assignedIds = currentUser.selectedClasses || [];
                      const assignedClasses = classes.filter(c => assignedIds.includes(c.id));
                      
                      if (assignedClasses.length === 0) {
                        return (
                          <p className="text-slate-405 text-xs italic text-center py-4 bg-white rounded-xl border border-slate-100">
                            No courses have been explicitly assigned to you yet by the administrator.
                          </p>
                        );
                      }
                      
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {assignedClasses.map(c => (
                            <div key={c.id} className="p-3 bg-white border border-slate-150/70 rounded-xl space-y-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                              <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold uppercase tracking-wider">{c.subject}</span>
                              <h4 className="text-xs font-extrabold text-slate-850 leading-snug">{c.title}</h4>
                              <p className="text-[10px] text-slate-500">Instructor Ref: <span className="font-semibold text-slate-700">{c.tutorName || "Faculty Instructor"}</span></p>
                              <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-[10px] mt-1 font-mono">
                                <span className="text-slate-500 font-bold">{c.schedule}</span>
                                <span className="text-indigo-650 font-black">LKR {c.price}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-2 pt-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" /> Active Enrolled Subject Classes
                  </h3>
                  
                  {studentBookings.filter(b => b.status === 'active').length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">
                      You are not currently enrolled in any academic courses. Browse Classes to add subjects.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {studentBookings.filter(b => b.status === "active").map((b) => (
                        <div 
                          key={b.id} 
                          className="p-4 border border-blue-50 bg-blue-50/10 rounded-2xl flex justify-between items-center transition-all hover:border-blue-200"
                        >
                          <div>
                            <span className="text-[9px] font-bold font-mono tracking-wider text-blue-600 uppercase">Enrolled Course Slot</span>
                            <h4 className="text-sm font-bold text-blue-950 mt-1 leading-snug">{b.classTitle}</h4>
                            <p className="text-xs text-gray-500 mt-1">Instructor: <span className="font-semibold text-gray-800">{b.tutorName}</span></p>
                            <p className="text-[11px] text-blue-600 font-medium mt-1 font-mono">Sessions: {b.dayOfWeek}s at {b.timeSlot}</p>
                          </div>
                          
                          <button
                            onClick={() => handleCancelBooking(b.id, b.classId)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center gap-1"
                          >
                            <XOctagon className="w-4 h-4" /> Cancel Seat
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payments Receipts right col */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-500" /> Tuition Payout Receipts Ledger
                  </h3>

                  <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
                    {paymentsList.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-xs text-sans">
                        No financial logs matching your user account.
                      </div>
                    ) : (
                      paymentsList.map((p) => {
                        const isSuccess = p.status === 'paid';
                        const isPending = p.status === 'pending';
                        return (
                          <div 
                            key={p.id} 
                            className="p-3 border border-gray-50 hover:border-gray-100 rounded-xl text-xs space-y-1 bg-gray-50/30"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-gray-800 truncate pr-2" title={p.classTitle}>{p.classTitle}</span>
                              <span className="font-extrabold text-blue-700 font-mono text-xs">LKR {p.amount}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-[10px] text-gray-405 font-mono pt-1">
                              <span>Method: {p.paymentMethod || 'Scholar wallet'}</span>
                              <span>Date: {new Date(p.date).toLocaleDateString()}</span>
                            </div>

                            <div className="pt-2 flex justify-between items-center border-t border-dashed border-gray-100 mt-1">
                              <span className="text-[9px] text-gray-400 uppercase font-bold font-mono">ID: {p.id}</span>
                              {isSuccess && (
                                <span className="inline-flex items-center gap-1 py-0.5 px-2 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-semibold">
                                  <CheckCircle className="w-3 h-3" /> Paid
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 py-0.5 px-2 bg-yellow-101 text-yellow-800 rounded-full text-[9px] font-semibold">
                                  <Hourglass className="w-3 h-3" /> Pending
                                </span>
                              )}
                              {!isSuccess && !isPending && (
                                <span className="inline-flex items-center gap-1 py-0.5 px-2 bg-red-100 text-red-850 rounded-full text-[9px] font-semibold">
                                  <AlertTriangle className="w-3 h-3" /> Failed
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {/* 3. Direct Chat Panel Tab */}
            {activeSubTab === 'chat' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ChatWidget currentUserId={currentUser.uid} currentUserRole="student" />
              </motion.div>
            )}

            {/* 4. Notifications tab */}
            {activeSubTab === 'notifications' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start"
              >
                
                {/* Lists alerts */}
                <div className="lg:col-span-3 bg-white border border-gray-150 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-blue-900 flex items-center justify-between border-b pb-4 border-gray-50 mb-4">
                    <span>Notifications Dashboard</span>
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="px-2.5 py-0.5 text-xs bg-red-500 text-white font-bold rounded-full">
                        {notifications.filter(n => !n.isRead).length} Unread
                      </span>
                    )}
                  </h3>

                  <div className="space-y-3.5">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-xs">
                        No notification logs found.
                      </div>
                    ) : (
                      notifications.map((not) => (
                        <div 
                          key={not.id}
                          className={`p-4 rounded-xl border flex justify-between items-start transition-all ${
                            !not.isRead 
                              ? 'bg-blue-50/20 border-blue-100/70 shadow-xs' 
                              : 'bg-white border-gray-100'
                          }`}
                        >
                          <div>
                            <span className="block text-xs font-bold text-blue-950 font-sans">{not.title}</span>
                            <span className="block text-xs text-gray-500 mt-1 leading-snug">{not.message}</span>
                            <span className="block text-[10px] text-gray-400 mt-2 font-mono">
                              Logged UTC: {new Date(not.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {!not.isRead && (
                            <button
                              onClick={async () => {
                                await firestoreService.markNotificationRead(not.id);
                                await refreshNotifications();
                              }}
                              className="p-1 px-2 hover:bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100 flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Read
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Alerts customization config settings */}
                <div className="bg-white border border-gray-150 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-gray-900 border-b pb-4 border-gray-50 mb-4 flex items-center gap-2">
                    <Sliders className="w-4.5 h-4.5 text-blue-500" />
                    Alert Handles
                  </h3>
                  <p className="text-xs text-gray-400 mb-5">Manage personalized alerts sync settings:</p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Course Reminders</span>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.reminders}
                        onChange={(e) => updateNotificationSettings({ reminders: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Payments Alerts</span>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.payments}
                        onChange={(e) => updateNotificationSettings({ payments: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Tutor Messages</span>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.messages}
                        onChange={(e) => updateNotificationSettings({ messages: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </div>
                    
                    {/* Specific Email Triggers Section */}
                    <div className="border-t pt-4 border-dashed border-gray-100 space-y-3.5">
                      <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-650 font-mono">Email Notification Triggers</h4>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Class revisions & timing alterations</span>
                          <span className="block text-[9px] text-gray-400">Receive alerts when schedule slots or links change</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailClassRevisions}
                          onChange={(e) => updateNotificationSettings({ emailClassRevisions: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Booking & enrollment receipts</span>
                          <span className="block text-[9px] text-gray-400">Receive confirmations on seat reservations</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailBookingStatus}
                          onChange={(e) => updateNotificationSettings({ emailBookingStatus: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">New course worksheets & handouts</span>
                          <span className="block text-[9px] text-gray-400">Alert me when files or handouts are distributed</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailStudyMaterials}
                          onChange={(e) => updateNotificationSettings({ emailStudyMaterials: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-750">Grade & performance analysis reports</span>
                          <span className="block text-[9px] text-gray-400">Receive monthly progress summaries and charts</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={!!notificationSettings.emailPerformanceLogs}
                          onChange={(e) => updateNotificationSettings({ emailPerformanceLogs: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-4 border-dashed border-gray-100">
                      <div>
                        <span className="text-xs font-bold text-blue-700">Inbox Copy Sync</span>
                        <span className="block text-[9px] text-gray-400 leading-none mt-0.5">Route copy to email addresses</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.emailSync}
                        onChange={(e) => updateNotificationSettings({ emailSync: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

          </div>
        )}

      </div>
    </motion.div>
  );
};
