import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SavedItemType } from '../types';

export interface BookmarkButtonProps {
  itemId: string;
  itemType: SavedItemType;
  title: string;
  description?: string;
  categoryOrSubject?: string;
  sourceTitle?: string;
  referenceUrl?: string;
  fileType?: string;
  createdAt?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'icon-only' | 'badge';
  className?: string;
  id?: string;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  itemId,
  itemType,
  title,
  description,
  categoryOrSubject,
  sourceTitle,
  referenceUrl,
  fileType,
  createdAt,
  size = 'sm',
  variant = 'icon-only',
  className = '',
  id
}) => {
  const { isBookmarked, toggleBookmark, currentUser } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  const bookmarked = isBookmarked(itemId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await toggleBookmark({
        itemId,
        itemType,
        title,
        description,
        categoryOrSubject,
        sourceTitle,
        referenceUrl,
        fileType,
        createdAt
      });
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (variant === 'button') {
    return (
      <motion.button
        type="button"
        id={id || `btn_bookmark_${itemId}`}
        whileTap={{ scale: 0.94 }}
        onClick={handleClick}
        disabled={isProcessing}
        title={bookmarked ? 'Remove from Saved Items' : 'Save to your profile Saved Items'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
          bookmarked
            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-2xs'
            : 'bg-slate-50 dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-amber-50/70 hover:text-amber-700 hover:border-amber-200 border-slate-200 dark:border-slate-700'
        } ${className}`}
      >
        <Bookmark
          className={`${iconSizes[size]} transition-all ${
            bookmarked ? 'fill-amber-500 text-amber-600' : 'text-slate-400 group-hover:text-amber-600'
          }`}
        />
        <span>{bookmarked ? 'Saved' : 'Bookmark'}</span>
      </motion.button>
    );
  }

  if (variant === 'badge') {
    return (
      <motion.button
        type="button"
        id={id || `btn_bookmark_${itemId}`}
        whileTap={{ scale: 0.94 }}
        onClick={handleClick}
        disabled={isProcessing}
        title={bookmarked ? 'Remove from Saved Items' : 'Save to profile'}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer border ${
          bookmarked
            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 border-slate-200 dark:border-slate-700'
        } ${className}`}
      >
        <Bookmark className={`w-3 h-3 ${bookmarked ? 'fill-amber-500 text-amber-600' : ''}`} />
        <span>{bookmarked ? 'Saved' : 'Save'}</span>
      </motion.button>
    );
  }

  // Default 'icon-only'
  return (
    <motion.button
      type="button"
      id={id || `btn_bookmark_${itemId}`}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.08 }}
      onClick={handleClick}
      disabled={isProcessing}
      title={bookmarked ? 'Bookmarked (Click to remove from profile)' : 'Bookmark and save to profile'}
      className={`p-2 rounded-xl transition-all cursor-pointer border ${
        bookmarked
          ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-2xs'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 border-slate-200 dark:border-slate-700'
      } ${className}`}
    >
      <Bookmark
        className={`${iconSizes[size]} transition-all ${
          bookmarked ? 'fill-amber-500 text-amber-600' : 'text-slate-400'
        }`}
      />
    </motion.button>
  );
};
