import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bookmark, 
  BookOpen, 
  Megaphone, 
  Trash2, 
  ExternalLink, 
  Search, 
  Filter, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Calendar, 
  Sparkles, 
  Eye, 
  X, 
  Download,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SavedItem, SavedItemType } from '../types';

interface SavedItemsSectionProps {
  onNavigateToClasses?: () => void;
  onNavigateToAnnouncements?: () => void;
  onCloseParentModal?: () => void;
  compact?: boolean;
}

export const SavedItemsSection: React.FC<SavedItemsSectionProps> = ({
  onNavigateToClasses,
  onNavigateToAnnouncements,
  onCloseParentModal,
  compact = false
}) => {
  const { currentUser, removeBookmark, showToast, setCurrentAppTab, navigateToClass } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'resource' | 'announcement'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'title'>('recent');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<SavedItem | null>(null);

  const savedItems: SavedItem[] = currentUser?.savedItems || [];

  const resourceCount = useMemo(() => savedItems.filter(i => i.itemType === 'resource').length, [savedItems]);
  const announcementCount = useMemo(() => savedItems.filter(i => i.itemType === 'announcement').length, [savedItems]);

  const filteredItems = useMemo(() => {
    return savedItems
      .filter(item => {
        if (filterType !== 'all' && item.itemType !== filterType) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.categoryOrSubject?.toLowerCase().includes(q) ||
          item.sourceTitle?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return (a.title || '').localeCompare(b.title || '');
        }
        return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      });
  }, [savedItems, filterType, searchQuery, sortBy]);

  const handleRemove = async (itemId: string, title: string) => {
    await removeBookmark(itemId);
  };

  const handleOpenResource = (item: SavedItem) => {
    if (item.referenceUrl) {
      window.open(item.referenceUrl, '_blank', 'noopener,noreferrer');
    } else {
      showToast(`Resource: "${item.title}"`, 'info');
    }
  };

  const formatSavedDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recently saved';
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header & Stats bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Bookmark className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Saved Items & Bookmarks
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                {savedItems.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Access your saved revision notes, lecture materials, and academy bulletins.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            All ({savedItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('resource')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'resource'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Resources ({resourceCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('announcement')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'announcement'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" /> Notices ({announcementCount})
          </button>
        </div>
      </div>

      {/* Search and Sort controls */}
      {savedItems.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved resources or announcements..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-amber-500 text-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'title')}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="recent">Recently Saved</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      )}

      {/* Items List */}
      {savedItems.length === 0 ? (
        <div className="p-8 sm:p-10 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-500">
            <Bookmark className="w-7 h-7" />
          </div>
          <div className="max-w-sm mx-auto">
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">No Saved Items Yet</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              You can bookmark any study material, lecture PDF, video, or academy announcement across the portal to quickly access them here.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onCloseParentModal?.();
                if (onNavigateToClasses) onNavigateToClasses();
                else setCurrentAppTab('classes');
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" /> Browse Course Materials
            </button>
            <button
              type="button"
              onClick={() => {
                onCloseParentModal?.();
                if (onNavigateToAnnouncements) onNavigateToAnnouncements();
                else setCurrentAppTab('announcements');
              }}
              className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Megaphone className="w-3.5 h-3.5" /> View Announcements
            </button>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
          No saved items match your filter criteria "{searchQuery}".
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => {
              const isResource = item.itemType === 'resource';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Item Icon */}
                    <div
                      className={`p-2.5 rounded-xl text-white font-bold shrink-0 mt-0.5 ${
                        isResource
                          ? item.fileType === 'video'
                            ? 'bg-purple-600'
                            : item.fileType === 'link'
                            ? 'bg-indigo-600'
                            : 'bg-emerald-600'
                          : 'bg-amber-500'
                      }`}
                    >
                      {isResource ? (
                        item.fileType === 'video' ? (
                          <Video className="w-4 h-4" />
                        ) : item.fileType === 'link' ? (
                          <LinkIcon className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )
                      ) : (
                        <Megaphone className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {/* Type badge */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isResource
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {isResource ? 'Course Resource' : 'Announcement'}
                        </span>

                        {/* Category or Subject */}
                        {item.categoryOrSubject && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.categoryOrSubject}
                          </span>
                        )}

                        {/* Saved timestamp */}
                        <span className="text-[10px] text-slate-400 font-medium ml-auto sm:ml-0 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatSavedDate(item.savedAt)}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug truncate">
                        {item.title}
                      </h4>

                      {item.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {item.sourceTitle && (
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                          Source: <span className="text-slate-650 dark:text-slate-300">{item.sourceTitle}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions right col */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isResource ? (
                      item.referenceUrl ? (
                        <button
                          type="button"
                          onClick={() => handleOpenResource(item)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Resource</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onCloseParentModal?.();
                            setCurrentAppTab('classes');
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Class Notes</span>
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedAnnouncement(item)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Read Notice</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemove(item.itemId || item.id, item.title)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                      title="Remove from saved items"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Announcement Details Viewer Modal */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <div 
            className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans"
            onClick={() => setSelectedAnnouncement(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl relative space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 uppercase">
                  Saved Notice
                </span>
                {selectedAnnouncement.categoryOrSubject && (
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedAnnouncement.categoryOrSubject}
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                {selectedAnnouncement.title}
              </h3>

              <div className="text-xs text-slate-400 flex items-center gap-3">
                {selectedAnnouncement.sourceTitle && <span>Issued by: <strong className="text-slate-600 dark:text-slate-300">{selectedAnnouncement.sourceTitle}</strong></span>}
                <span>Saved on {formatSavedDate(selectedAnnouncement.savedAt)}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {selectedAnnouncement.description || 'No additional content provided.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAnnouncement(null)}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-950 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close Notice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
