import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, Search, X, ChevronDown, RotateCcw, Check, Sparkles, SlidersHorizontal, ChevronRight, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface FilterOption {
  label: string;
  value: string;
  badge?: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
}

export interface FilterSubcategory {
  id: string;
  title: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
}

export interface FilterGroup {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  // If group has direct options:
  value?: string;
  options?: FilterOption[];
  onChange?: (value: string) => void;
  // If group has subcategories:
  subcategories?: FilterSubcategory[];
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
  filterGroups = [],
  activeFilterCount = 0,
  onResetFilters,
  customFilterContent,
  activeTags = [],
  extraActions,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [optionFilterText, setOptionFilterText] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize or update active category if groups change
  useEffect(() => {
    if (filterGroups && filterGroups.length > 0) {
      if (!activeCategoryId || !filterGroups.some(g => g.id === activeCategoryId)) {
        setActiveCategoryId(filterGroups[0].id);
      }
    }
  }, [filterGroups, activeCategoryId]);

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

  // Identify active group
  const activeGroup = useMemo(() => {
    if (!filterGroups || filterGroups.length === 0) return null;
    return filterGroups.find(g => g.id === activeCategoryId) || filterGroups[0];
  }, [filterGroups, activeCategoryId]);

  // Helper to count active selections in a group
  const getGroupActiveCount = (group: FilterGroup) => {
    let count = 0;
    if (group.value && group.value !== 'all' && group.value !== '') {
      count += 1;
    }
    if (group.subcategories) {
      group.subcategories.forEach(sub => {
        if (sub.value && sub.value !== 'all' && sub.value !== '') {
          count += 1;
        }
      });
    }
    return count;
  };

  return (
    <div className={`space-y-2.5 ${className}`} ref={containerRef}>
      {/* Unified Compact Single Bar: [ Filter Button ] and [ Multifunctional Search Bar ] in ONE LINE */}
      <div className="flex flex-row items-center gap-2 relative w-full">
        
        {/* Multifunctional Filter Button before Search Bar (Wordless, Icon + Badge only) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsOpen(prev => !prev);
              setOptionFilterText('');
            }}
            aria-expanded={isOpen}
            className={`h-10 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer select-none shrink-0 shadow-2xs ${
              hasActiveFilters || isOpen
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
            }`}
            title="Filter parameters"
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

          {/* Floating Modern Filter Popover (Main Categories & Subcategories Architecture) */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute left-0 top-11 z-50 w-[94vw] sm:w-[520px] md:w-[600px] max-h-[85vh] sm:max-h-[460px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl text-xs overflow-hidden"
              >
                {/* Modern Popover Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 shrink-0">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </div>
                    <span>Filter Parameters</span>
                    {activeFilterCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                        {activeFilterCount} active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onResetFilters && hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          onResetFilters();
                          setOptionFilterText('');
                        }}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer transition-colors"
                        title="Reset all filter parameters"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset All
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      title="Close filters"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Custom filter content if passed */}
                {customFilterContent && (
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
                    {customFilterContent}
                  </div>
                )}

                {/* Modern Categorized Filter Hub: Main Categories & Subcategories */}
                {filterGroups && filterGroups.length > 0 && (
                  <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
                    
                    {/* Main Categories Navigation Rail (Multiple groups) */}
                    {filterGroups.length > 1 && (
                      <div className="sm:w-44 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2 shrink-0 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto no-scrollbar">
                        <div className="hidden sm:block px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Main Categories
                        </div>
                        {filterGroups.map(group => {
                          const isSelected = group.id === activeCategoryId;
                          const activeCount = getGroupActiveCount(group);
                          const Icon = group.icon;

                          return (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => {
                                setActiveCategoryId(group.id);
                                setOptionFilterText('');
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all flex items-center justify-between gap-2 shrink-0 sm:w-full cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {Icon ? (
                                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                ) : (
                                  <Hash className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                )}
                                <span className="truncate">{group.title}</span>
                              </div>
                              {activeCount > 0 && (
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                                  isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                                }`}>
                                  {activeCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Subcategories & Options Panel for Active Category */}
                    <div className="flex-1 p-4 overflow-y-auto max-h-[300px] sm:max-h-none space-y-4">
                      {activeGroup && (
                        <div>
                          {/* Active Group Header / Quick Search if many options */}
                          <div className="flex items-center justify-between gap-2 mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider font-mono">
                                {activeGroup.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Select parameter options below
                              </p>
                            </div>

                            {/* Optional quick option search if active group has > 6 options */}
                            {((activeGroup.options && activeGroup.options.length > 6) ||
                              (activeGroup.subcategories && activeGroup.subcategories.some(s => s.options.length > 4))) && (
                              <div className="relative w-36 sm:w-44">
                                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  placeholder="Quick filter..."
                                  value={optionFilterText}
                                  onChange={(e) => setOptionFilterText(e.target.value)}
                                  className="w-full h-7 pl-7 pr-2 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                                />
                              </div>
                            )}
                          </div>

                          {/* Case A: Active group has nested subcategories */}
                          {activeGroup.subcategories && activeGroup.subcategories.length > 0 ? (
                            <div className="space-y-4">
                              {activeGroup.subcategories.map(sub => {
                                const visibleOptions = optionFilterText.trim()
                                  ? sub.options.filter(o => o.label.toLowerCase().includes(optionFilterText.toLowerCase()))
                                  : sub.options;

                                return (
                                  <div key={sub.id} className="space-y-2 bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        {sub.title}
                                      </span>
                                      {sub.value && sub.value !== 'all' && (
                                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                          Selected
                                        </span>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                                      {visibleOptions.map(opt => {
                                        const isSelected = sub.value === opt.value;
                                        const Icon = opt.icon;

                                        return (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => sub.onChange(opt.value)}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer border ${
                                              isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 font-bold shadow-2xs'
                                                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                          >
                                            <span className="truncate flex items-center gap-1">
                                              {Icon && <Icon className="w-3 h-3 shrink-0 opacity-70" />}
                                              {opt.label}
                                            </span>
                                            {opt.badge !== undefined && (
                                              <span className="text-[9px] font-mono text-slate-400 shrink-0">
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
                                );
                              })}
                            </div>
                          ) : (
                            /* Case B: Active group has direct options */
                            activeGroup.options && (
                              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                                {(optionFilterText.trim()
                                  ? activeGroup.options.filter(o => o.label.toLowerCase().includes(optionFilterText.toLowerCase()))
                                  : activeGroup.options
                                ).map(opt => {
                                  const isSelected = activeGroup.value === opt.value;
                                  const Icon = opt.icon;

                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        if (activeGroup.onChange) {
                                          activeGroup.onChange(opt.value);
                                        }
                                      }}
                                      className={`px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer border ${
                                        isSelected
                                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 font-bold shadow-2xs'
                                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 stroke-[3]" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Popover footer action */}
                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 flex items-center justify-between shrink-0">
                  <span className="text-[11px] text-slate-400 font-sans">
                    {hasActiveFilters ? 'Filters applied dynamically' : 'No filters active'}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && onResetFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          onResetFilters();
                          setOptionFilterText('');
                        }}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-semibold cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      Apply & Close
                    </button>
                  </div>
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

        {/* Optional Extra Right Actions (e.g. QR Scanner, Create Button, view toggles) */}
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
