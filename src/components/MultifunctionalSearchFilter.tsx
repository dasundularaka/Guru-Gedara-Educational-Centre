import React, { useState, useRef, useEffect } from 'react';
import { Filter, Search, X, ChevronDown, RotateCcw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface FilterOption {
  label: string;
  value: string;
  badge?: string | number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface FilterGroup {
  id: string;
  title: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export interface ActiveFilterTag {
  id: string;
  label: string;
  valueLabel: string;
  onRemove: () => void;
}

interface MultifunctionalSearchFilterProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchId?: string;

  // Filter Button & Dropdown
  filterButtonLabel?: string;
  filterGroups?: FilterGroup[];
  activeFilterCount?: number;
  onResetFilters?: () => void;
  customFilterContent?: React.ReactNode;

  // Active filter tags display
  activeTags?: ActiveFilterTag[];

  // Extra action elements (e.g. buttons or view switchers on the right)
  extraActions?: React.ReactNode;

  // Styling
  className?: string;
}

export const MultifunctionalSearchFilter: React.FC<MultifunctionalSearchFilterProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchId,
  filterButtonLabel = 'Filters',
  filterGroups,
  activeFilterCount = 0,
  onResetFilters,
  customFilterContent,
  activeTags = [],
  extraActions,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const hasActiveFilters = activeFilterCount > 0 || (activeTags && activeTags.length > 0);

  return (
    <div className={`space-y-2.5 ${className}`} ref={containerRef}>
      {/* Unified Compact Single Bar: [ Filter Button ] and [ Multifunctional Search Bar ] in ONE LINE */}
      <div className="flex flex-row items-center gap-2 relative w-full">
        
        {/* Multifunctional Filter Button before Search Bar (No text words, icon + badge only) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            aria-expanded={isOpen}
            className={`h-10 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer select-none shrink-0 shadow-2xs ${
              hasActiveFilters || isOpen
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
            }`}
            title="Filters"
            aria-label="Filter parameters"
          >
            <Filter className={`w-4 h-4 ${hasActiveFilters ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
            {activeFilterCount > 0 && (
              <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Floating Multifunctional Filter Dropdown Popover */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute left-0 top-11 z-50 w-[88vw] sm:w-80 md:w-96 max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-4 text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Filter Parameters</span>
                    {activeFilterCount > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        ({activeFilterCount} active)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {onResetFilters && hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          onResetFilters();
                        }}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                      title="Close filters"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Custom filter content if passed */}
                {customFilterContent}

                {/* Pre-configured filter groups */}
                {filterGroups && filterGroups.length > 0 && (
                  <div className="space-y-4">
                    {filterGroups.map(group => (
                      <div key={group.id} className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono tracking-wider block">
                          {group.title}
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {group.options.map(opt => {
                            const isSelected = group.value === opt.value;
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  group.onChange(opt.value);
                                }}
                                className={`px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer border ${
                                  isSelected
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 font-bold'
                                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span className="truncate flex items-center gap-1.5">
                                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />}
                                  {opt.label}
                                </span>
                                {opt.badge !== undefined && (
                                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                    {opt.badge}
                                  </span>
                                )}
                                {isSelected && (
                                  <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0 stroke-[3]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Popover footer action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {hasActiveFilters ? 'Filters applied dynamically' : 'No filters applied'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Apply & Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Multifunctional Search Bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id={searchId}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 pl-10 pr-9 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans shadow-2xs"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Optional Extra Right Actions (e.g. Create Button, view toggles) */}
        {extraActions && (
          <div className="shrink-0 flex items-center gap-2">
            {extraActions}
          </div>
        )}
      </div>

      {/* Compact Active Filter Chips (if any filter is active) */}
      {activeTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1">
            Active:
          </span>
          {activeTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-medium"
            >
              <span className="text-slate-500 dark:text-slate-400">{tag.label}:</span>
              <strong className="font-bold">{tag.valueLabel}</strong>
              <button
                type="button"
                onClick={tag.onRemove}
                className="text-indigo-400 hover:text-indigo-700 dark:hover:text-white ml-0.5 cursor-pointer"
                title={`Remove ${tag.label} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 underline cursor-pointer ml-1"
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
};
