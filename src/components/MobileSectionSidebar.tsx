import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layers, ChevronRight, Sparkles } from 'lucide-react';

export interface SectionSidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  description?: string;
  category?: string;
}

interface MobileSectionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  items: SectionSidebarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  title?: string;
  roleLabel?: string;
  roleBadgeColor?: string;
}

export const MobileSectionSidebar: React.FC<MobileSectionSidebarProps> = ({
  isOpen,
  onClose,
  items,
  activeId,
  onSelect,
  title = "Navigation Sections",
  roleLabel = "Dashboard",
  roleBadgeColor = "bg-indigo-500"
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Sidebar Canvas */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-[85%] max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-r border-slate-200 dark:border-slate-800"
            id="mobile_section_sidebar_drawer"
          >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/70 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${roleBadgeColor} animate-pulse`} />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                      {title}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      {roleLabel} Navigation
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors touch-target flex items-center justify-center cursor-pointer"
                  title="Close Sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 overscroll-contain">
                {items.map((item) => {
                  const isActive = item.id === activeId;
                  return (
                    <button
                      key={item.id}
                      id={`sidebar_item_${item.id}`}
                      type="button"
                      onClick={() => {
                        onSelect(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left touch-target ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black scale-[1.01]'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs truncate leading-tight">
                            {item.label}
                          </span>
                          {item.description && (
                            <span
                              className={`block text-[10px] truncate mt-0.5 ${
                                isActive ? 'text-indigo-100' : 'text-slate-400'
                              }`}
                            >
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.badge !== undefined && Number(item.badge) > 0 ? (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-black rounded-full shrink-0 ${
                            isActive
                              ? 'bg-white text-indigo-700'
                              : 'bg-rose-500 text-white animate-pulse'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : (
                        isActive && (
                          <Sparkles className="w-4 h-4 text-white/80 shrink-0" />
                        )
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-center shrink-0">
                <p className="text-[10px] font-mono text-slate-400">
                  Gurugedara Higher Education Institute
                </p>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
  );
};
