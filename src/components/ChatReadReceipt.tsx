import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface ChatReadReceiptProps {
  isRead?: boolean;
  readAt?: string;
  isOwnMessage: boolean;
}

export const ChatReadReceipt: React.FC<ChatReadReceiptProps> = ({
  isRead,
  readAt,
  isOwnMessage
}) => {
  if (!isOwnMessage) return null;

  const formattedReadTime = readAt
    ? new Date(readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const tooltipTitle = isRead
    ? `Seen ${formattedReadTime ? `at ${formattedReadTime}` : ''}`
    : 'Delivered';

  return (
    <span 
      className="inline-flex items-center ml-1 cursor-default shrink-0" 
      title={tooltipTitle}
      id="chat_read_receipt_indicator"
    >
      {isRead ? (
        <CheckCheck className="w-3.5 h-3.5 text-sky-300 dark:text-sky-400 stroke-[2.5]" />
      ) : (
        <Check className="w-3 h-3 text-white/60 dark:text-slate-400 stroke-[2]" />
      )}
    </span>
  );
};
