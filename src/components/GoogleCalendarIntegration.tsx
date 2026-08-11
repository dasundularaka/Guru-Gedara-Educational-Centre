import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  fetchGoogleCalendarEvents, 
  createGoogleCalendarEvent, 
  deleteGoogleCalendarEvent, 
  buildGoogleCalendarEventFromClass, 
  GoogleCalendarEvent 
} from '../lib/googleCalendarService';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Link2, 
  ShieldCheck, 
  BookOpen, 
  X,
  CalendarPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleCalendarPaymentReminders } from './GoogleCalendarPaymentReminders';
import { GoogleCalendarPostClassFeedbackModal } from './GoogleCalendarPostClassFeedbackModal';

export const GoogleCalendarIntegration: React.FC = () => {
  const { 
    currentUser, 
    classes, 
    bookings, 
    payments,
    googleAccessToken, 
    connectGoogleCalendar, 
    disconnectGoogleCalendar, 
    showToast 
  } = useApp();

  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [syncingClassId, setSyncingClassId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  // New Event Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSummary, setNewSummary] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('Guru Gedara Main Campus');
  const [newStartDateTime, setNewStartDateTime] = useState('');
  const [newEndDateTime, setNewEndDateTime] = useState('');
  const [newAttendee, setNewAttendee] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User Confirmation Modal state (Mandatory for destructive/creation operations)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'create' | 'delete' | 'sync_all';
    title: string;
    message: string;
    actionPayload?: any;
  }>({
    isOpen: false,
    type: 'create',
    title: '',
    message: ''
  });

  // Filter user's classes
  const isStudent = currentUser?.role === 'student';
  const isTutor = currentUser?.role === 'tutor';

  const userEnrolledClasses = classes.filter(c => {
    if (isTutor) return c.tutorId === currentUser?.uid;
    if (isStudent) {
      const selected = currentUser?.selectedClasses || [];
      const isBooked = bookings.some(b => b.studentId === currentUser?.uid && b.classId === c.id && b.status !== 'cancelled');
      return selected.includes(c.id) || isBooked;
    }
    return true; // Admin sees all
  });

  // Fetch events whenever googleAccessToken changes
  const loadCalendarEvents = async () => {
    if (!googleAccessToken) return;
    setLoadingEvents(true);
    try {
      const items = await fetchGoogleCalendarEvents(googleAccessToken);
      setEvents(items);
    } catch (err: any) {
      console.error("Failed to load Google Calendar events:", err);
      showToast(err.message || "Failed to load Google Calendar events.", "error");
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (googleAccessToken) {
      loadCalendarEvents();
    } else {
      setEvents([]);
    }
  }, [googleAccessToken]);

  // Handler: Prompt creation confirmation
  const handleOpenCreateConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSummary || !newStartDateTime || !newEndDateTime) {
      showToast("Please specify event summary, start time, and end time.", "error");
      return;
    }

    const formattedStart = new Date(newStartDateTime).toLocaleString();
    const formattedEnd = new Date(newEndDateTime).toLocaleString();

    setConfirmModal({
      isOpen: true,
      type: 'create',
      title: 'Confirm Google Calendar Event Creation',
      message: `Are you sure you want to schedule "${newSummary}" in your primary Google Calendar from ${formattedStart} to ${formattedEnd}?`
    });
  };

  // Execute Event Creation
  const executeCreateEvent = async () => {
    if (!googleAccessToken) return;
    setIsSubmitting(true);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Colombo';
      const eventPayload: GoogleCalendarEvent = {
        summary: newSummary,
        description: newDescription || 'Scheduled via Guru Gedara Educational Portal.',
        location: newLocation,
        start: {
          dateTime: new Date(newStartDateTime).toISOString(),
          timeZone
        },
        end: {
          dateTime: new Date(newEndDateTime).toISOString(),
          timeZone
        },
        attendees: newAttendee ? [{ email: newAttendee }] : undefined
      };

      await createGoogleCalendarEvent(googleAccessToken, eventPayload);
      showToast(`Successfully created "${newSummary}" on Google Calendar!`, "success");
      setIsAddModalOpen(false);
      setNewSummary('');
      setNewDescription('');
      setNewStartDateTime('');
      setNewEndDateTime('');
      setNewAttendee('');
      await loadCalendarEvents();
    } catch (err: any) {
      console.error("Create event error:", err);
      showToast(err.message || "Failed to create Google Calendar event.", "error");
    } finally {
      setIsSubmitting(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Handler: Prompt Delete Confirmation
  const promptDeleteEvent = (event: GoogleCalendarEvent) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      title: 'Confirm Event Deletion',
      message: `Are you sure you want to permanently remove "${event.summary}" from your Google Calendar? This action cannot be undone.`,
      actionPayload: event.id
    });
  };

  // Execute Event Deletion
  const executeDeleteEvent = async (eventId: string) => {
    if (!googleAccessToken) return;
    try {
      await deleteGoogleCalendarEvent(googleAccessToken, eventId);
      showToast("Event deleted from Google Calendar.", "success");
      await loadCalendarEvents();
    } catch (err: any) {
      console.error("Delete event error:", err);
      showToast(err.message || "Failed to delete Google Calendar event.", "error");
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Handler: Sync Single Class
  const syncSingleClassToCalendar = async (classItem: any) => {
    if (!googleAccessToken) {
      showToast("Please connect Google Calendar first.", "info");
      return;
    }
    setSyncingClassId(classItem.id);
    try {
      const payload = buildGoogleCalendarEventFromClass(classItem, currentUser?.email);
      await createGoogleCalendarEvent(googleAccessToken, payload);
      showToast(`Class "${classItem.title}" exported to Google Calendar!`, "success");
      await loadCalendarEvents();
    } catch (err: any) {
      console.error("Sync class error:", err);
      showToast(err.message || `Failed to sync ${classItem.title}`, "error");
    } finally {
      setSyncingClassId(null);
    }
  };

  // Handler: Prompt Sync All
  const promptSyncAllClasses = () => {
    if (!googleAccessToken) {
      showToast("Please connect Google Calendar first.", "info");
      return;
    }
    if (userEnrolledClasses.length === 0) {
      showToast("No active courses available to sync.", "info");
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'sync_all',
      title: 'Sync All Class Schedules to Google Calendar',
      message: `This will create ${userEnrolledClasses.length} event(s) in your primary Google Calendar for your active course timetable. Do you want to proceed?`
    });
  };

  // Execute Sync All
  const executeSyncAllClasses = async () => {
    if (!googleAccessToken) return;
    setSyncingAll(true);
    let successCount = 0;
    try {
      for (const cls of userEnrolledClasses) {
        const payload = buildGoogleCalendarEventFromClass(cls, currentUser?.email);
        await createGoogleCalendarEvent(googleAccessToken, payload);
        successCount++;
      }
      showToast(`Successfully synced ${successCount} course schedules to Google Calendar!`, "success");
      await loadCalendarEvents();
    } catch (err: any) {
      console.error("Sync all error:", err);
      showToast(err.message || "Failed to sync all classes to Google Calendar.", "error");
    } finally {
      setSyncingAll(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="space-y-6" id="google_calendar_integration_root">
      {/* Connection Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Google Calendar Synchronization</h3>
                {googleAccessToken ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5" /> Disconnected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sync course schedules, tutor sessions, and study milestones directly with your personal Google Calendar with full permission control.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            {googleAccessToken ? (
              <>
                <button
                  type="button"
                  onClick={loadCalendarEvents}
                  disabled={loadingEvents}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin text-indigo-600' : ''}`} />
                  Refresh Feed
                </button>
                <button
                  type="button"
                  onClick={disconnectGoogleCalendar}
                  className="px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-semibold transition-all cursor-pointer"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={connectGoogleCalendar}
                className="gsi-material-button inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:shadow-md text-xs font-semibold transition-all cursor-pointer"
              >
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 block">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                <span>Connect Google Calendar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Class Export & Calendar Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Enrolled Courses & Quick Sync */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Course Schedule Sync
              </h4>
              <button
                type="button"
                onClick={promptSyncAllClasses}
                disabled={syncingAll || !googleAccessToken || userEnrolledClasses.length === 0}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                {syncingAll ? 'Syncing...' : 'Sync All'}
              </button>
            </div>

            {userEnrolledClasses.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No enrolled courses available to export.</p>
            ) : (
              <div className="space-y-3">
                {userEnrolledClasses.map((cls) => (
                  <div key={cls.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{cls.title}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {cls.dayOfWeek || 'Scheduled Day'} • {cls.timeSlot || cls.schedule || 'Standard Slot'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => syncSingleClassToCalendar(cls)}
                      disabled={syncingClassId === cls.id || !googleAccessToken}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 text-indigo-600 dark:text-indigo-400 disabled:opacity-50 text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                    >
                      {syncingClassId === cls.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      Sync
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-indigo-900 text-white rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-700/30 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-2 text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-[11px] font-bold tracking-wider uppercase">Privacy & Safety</span>
            </div>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Google Calendar integration accesses your primary calendar strictly with explicit permission. Creating or deleting entries always requests user confirmation.
            </p>
          </div>
        </div>

        {/* Right Column: Google Calendar Events Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-indigo-500" />
                  Live Google Calendar Feed
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Upcoming events fetched directly from your connected Google Calendar
                </p>
              </div>

              {googleAccessToken && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Schedule Event
                </button>
              )}
            </div>

            {!googleAccessToken ? (
              <div className="py-12 text-center rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 p-6">
                <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300">Google Calendar Not Connected</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Connect your Google account above to view your live Google Calendar events and export study schedules effortlessly.
                </p>
                <button
                  type="button"
                  onClick={connectGoogleCalendar}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Connect Google Calendar
                </button>
              </div>
            ) : loadingEvents ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Fetching events from Google Calendar...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="py-12 text-center rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-6">
                <p className="text-xs text-slate-500 dark:text-slate-400">No upcoming events found on your Google Calendar.</p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition-all cursor-pointer"
                >
                  + Add First Study Session
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => {
                  const startTime = ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : (ev.start?.date || 'All Day');
                  const endTime = ev.end?.dateTime ? new Date(ev.end.dateTime).toLocaleTimeString([], { timeStyle: 'short' }) : '';

                  return (
                    <div 
                      key={ev.id || Math.random()} 
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">{ev.summary}</h5>
                          {ev.htmlLink && (
                            <a 
                              href={ev.htmlLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Open in Google Calendar"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            {startTime} {endTime ? `- ${endTime}` : ''}
                          </span>
                          {ev.location && (
                            <span className="text-slate-600 dark:text-slate-300 font-medium">
                              📍 {ev.location}
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic mt-1">
                            {ev.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        {ev.htmlLink && (
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <ExternalLink className="w-3 h-3" /> View
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => promptDeleteEvent(ev)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          title="Delete from Google Calendar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Automated Email Reminders Triggered by Google Calendar Events */}
      <GoogleCalendarPaymentReminders payments={payments} />

      {/* Automated 24h Post-Class Feedback Trigger & Modal */}
      <GoogleCalendarPostClassFeedbackModal events={events} />

      {/* Schedule Event Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-emerald-600" />
                  New Google Calendar Event
                </h3>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleOpenCreateConfirmation} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Event Title / Summary *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Physics Revision Block with Tutor"
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newStartDateTime}
                      onChange={(e) => setNewStartDateTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      End Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newEndDateTime}
                      onChange={(e) => setNewEndDateTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Guru Gedara Campus / Zoom Link"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Attendee Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g., student@example.com"
                    value={newAttendee}
                    onChange={(e) => setNewAttendee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description / Agenda
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Notes for study session..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Proceed to Confirm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mandatory User Confirmation Modal for Mutations (SKILL.md required) */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {confirmModal.title}
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    if (confirmModal.type === 'create') executeCreateEvent();
                    if (confirmModal.type === 'delete') executeDeleteEvent(confirmModal.actionPayload);
                    if (confirmModal.type === 'sync_all') executeSyncAllClasses();
                  }}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                    confirmModal.type === 'delete'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isSubmitting ? 'Executing...' : 'Yes, Confirm Action'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
