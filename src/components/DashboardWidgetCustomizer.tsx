import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  Check, 
  Plus, 
  X, 
  Calendar, 
  CreditCard, 
  BookOpen, 
  Award, 
  QrCode, 
  Users, 
  ScanLine, 
  Activity,
  Pin,
  PinOff,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { UserProfile } from '../types';
import { firestoreService } from '../lib/firestoreService';

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: 'academic' | 'finance' | 'tools' | 'faculty';
  defaultPinned: boolean;
}

export const STUDENT_WIDGETS: WidgetDefinition[] = [
  {
    id: 'upcoming_classes',
    title: 'Upcoming Timetable',
    description: 'Quick countdown to your next live class schedules and lecture halls.',
    icon: Calendar,
    category: 'academic',
    defaultPinned: true
  },
  {
    id: 'class_resources',
    title: 'Class Study Resources',
    description: 'Direct access to newly uploaded revision notes, past papers, and PDFs.',
    icon: BookOpen,
    category: 'academic',
    defaultPinned: true
  },
  {
    id: 'recent_payments',
    title: 'Fees & Payment Receipts',
    description: 'Track tuition fee settlements, invoices, and payment receipts.',
    icon: CreditCard,
    category: 'finance',
    defaultPinned: true
  },
  {
    id: 'attendance_summary',
    title: 'Attendance & Punctuality',
    description: 'Real-time record of your session attendance and punctuality scores.',
    icon: Award,
    category: 'academic',
    defaultPinned: false
  },
  {
    id: 'digital_pass',
    title: 'Digital Student ID Pass',
    description: '1-click access to your verified QR Pass for attendance scanners.',
    icon: QrCode,
    category: 'tools',
    defaultPinned: true
  }
];

export const TUTOR_WIDGETS: WidgetDefinition[] = [
  {
    id: 'upcoming_sessions',
    title: 'Upcoming Teaching Sessions',
    description: 'Live timetable of your upcoming scheduled tutoring lectures.',
    icon: Calendar,
    category: 'faculty',
    defaultPinned: true
  },
  {
    id: 'quick_qr_scanner',
    title: 'Live QR Attendance Check-In',
    description: 'Instant barcode/QR code camera scanner for rapid student check-in.',
    icon: ScanLine,
    category: 'tools',
    defaultPinned: true
  },
  {
    id: 'class_resources_hub',
    title: 'Course Materials Hub',
    description: 'Quickly publish syllabus documents, notes, and video recordings.',
    icon: BookOpen,
    category: 'academic',
    defaultPinned: true
  },
  {
    id: 'enrolled_scholars',
    title: 'Enrolled Scholars Roster',
    description: 'Direct roster view of all enrolled scholars across your classes.',
    icon: Users,
    category: 'faculty',
    defaultPinned: true
  },
  {
    id: 'attendance_overview',
    title: 'Session Attendance Stats',
    description: 'Real-time roll-call statistics and student attendance records.',
    icon: Activity,
    category: 'tools',
    defaultPinned: false
  }
];

interface DashboardWidgetCustomizerProps {
  currentUser: UserProfile;
  role: 'student' | 'tutor';
  onNavigateTab?: (tab: string) => void;
  onOpenAction?: (actionId: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const DashboardWidgetCustomizer: React.FC<DashboardWidgetCustomizerProps> = ({
  currentUser,
  role,
  onNavigateTab,
  onOpenAction,
  showToast
}) => {
  const availableWidgets = role === 'student' ? STUDENT_WIDGETS : TUTOR_WIDGETS;
  const storageKey = `guru_pinned_widgets_${currentUser.uid}`;

  const getInitialPinned = (): string[] => {
    if (Array.isArray(currentUser.dashboardWidgets) && currentUser.dashboardWidgets.length > 0) {
      return currentUser.dashboardWidgets;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
    } catch {}
    return availableWidgets.filter(w => w.defaultPinned).map(w => w.id);
  };

  const [pinnedWidgetIds, setPinnedWidgetIds] = useState<string[]>(getInitialPinned());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleToggleWidget = async (widgetId: string) => {
    let next: string[];
    if (pinnedWidgetIds.includes(widgetId)) {
      if (pinnedWidgetIds.length <= 1) {
        showToast("Keep at least one quick-access widget pinned to your dashboard.", "info");
        return;
      }
      next = pinnedWidgetIds.filter(id => id !== widgetId);
    } else {
      next = [...pinnedWidgetIds, widgetId];
    }

    setPinnedWidgetIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      await firestoreService.updateUserProfile(currentUser.uid, {
        dashboardWidgets: next
      });
      showToast("Dashboard widgets updated successfully.", "success");
    } catch (e) {
      console.warn("Error saving widget preference:", e);
    }
  };

  const pinnedWidgets = availableWidgets.filter(w => pinnedWidgetIds.includes(w.id));

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">
            Pinned Quick-Access Widgets
          </h3>
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-mono">
            {pinnedWidgets.length} Active
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer hover:border-indigo-300"
          id="customize_dashboard_widgets_btn"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
          <span>Customize Widgets</span>
        </button>
      </div>

      {/* Quick Access Widget Tiles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {pinnedWidgets.map((w) => {
          const Icon = w.icon;
          return (
            <div
              key={w.id}
              onClick={() => {
                if (onOpenAction) onOpenAction(w.id);
              }}
              className="bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              id={`quick_widget_${w.id}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-600">
                    Quick Access
                  </span>
                </div>
                <h4 className="text-xs font-extrabold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                  {w.title}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {w.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-indigo-600">
                <span>Launch</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Widget Customizer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Customize Dashboard Widgets
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose which quick-access cards appear at the top of your dashboard.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {availableWidgets.map((w) => {
                const Icon = w.icon;
                const isPinned = pinnedWidgetIds.includes(w.id);

                return (
                  <div
                    key={w.id}
                    onClick={() => handleToggleWidget(w.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isPinned 
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs' 
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isPinned ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {w.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {w.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isPinned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600 text-white text-[10px] font-extrabold shadow-2xs">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-600 text-[10px] font-bold hover:border-slate-300">
                          <Plus className="w-3 h-3" /> Pin
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
