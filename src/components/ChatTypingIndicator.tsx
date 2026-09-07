import React from 'react';
import { motion } from 'motion/react';

interface ChatTypingIndicatorProps {
  userName?: string;
}

export const ChatTypingIndicator: React.FC<ChatTypingIndicatorProps> = ({ userName = 'Participant' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs w-fit border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
      id="chat_typing_indicator"
    >
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
      </div>
      <span className="font-medium text-[11px]">
        <strong className="font-bold text-slate-800 dark:text-slate-200">{userName}</strong> is typing...
      </span>
    </motion.div>
  );
};
