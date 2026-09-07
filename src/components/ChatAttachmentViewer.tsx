import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Eye, 
  X, 
  File, 
  FileSpreadsheet, 
  FileCode,
  Image as ImageIcon
} from 'lucide-react';
import { ChatAttachment } from '../types';

interface ChatAttachmentViewerProps {
  attachment: ChatAttachment;
  isOwnMessage?: boolean;
}

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getFileIcon = (mimeType?: string, fileName?: string) => {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  if (mimeType?.includes('pdf') || ext === 'pdf') {
    return <FileText className="w-4 h-4 text-rose-500" />;
  }
  if (mimeType?.includes('sheet') || mimeType?.includes('excel') || ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
  }
  if (mimeType?.includes('code') || mimeType?.includes('json') || mimeType?.includes('javascript') || ext === 'ts' || ext === 'tsx' || ext === 'js') {
    return <FileCode className="w-4 h-4 text-amber-500" />;
  }
  if (mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-blue-500" />;
  }
  return <File className="w-4 h-4 text-indigo-500" />;
};

export const ChatAttachmentViewer: React.FC<ChatAttachmentViewerProps> = ({
  attachment,
  isOwnMessage = false
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const isImage = attachment.fileType === 'image' || attachment.type?.startsWith('image/');

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name || 'chat-attachment';
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {isImage ? (
        <div className="relative group my-1 max-w-sm rounded-xl overflow-hidden shadow-xs border border-black/5 dark:border-white/10">
          <div 
            onClick={() => setIsLightboxOpen(true)}
            className="cursor-pointer relative overflow-hidden bg-slate-900/5 aspect-auto max-h-64 flex items-center justify-center"
          >
            <img 
              src={attachment.url} 
              alt={attachment.name || 'Chat image attachment'}
              className="w-full h-auto max-h-64 object-cover group-hover:scale-102 transition-transform duration-200"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            {/* Hover overlay with zoom & download */}
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-colors">
                <Eye className="w-4 h-4" />
              </span>
              <button 
                type="button"
                onClick={handleDownload}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-colors cursor-pointer"
                title="Download image"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className={`px-2.5 py-1.5 flex items-center justify-between text-[11px] gap-2 ${
            isOwnMessage 
              ? 'bg-black/15 text-white/90' 
              : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300'
          }`}>
            <span className="truncate max-w-[180px] font-medium">{attachment.name}</span>
            <span className="text-[10px] opacity-75 shrink-0 font-mono">{formatFileSize(attachment.size)}</span>
          </div>
        </div>
      ) : (
        <div 
          onClick={handleDownload}
          className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer my-1 group ${
            isOwnMessage
              ? 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs'
          }`}
          title={`Download ${attachment.name}`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isOwnMessage 
              ? 'bg-white/20 text-white' 
              : 'bg-slate-100 dark:bg-slate-700'
          }`}>
            {getFileIcon(attachment.type, attachment.name)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate leading-snug group-hover:underline">
              {attachment.name}
            </p>
            <p className={`text-[10px] font-mono ${
              isOwnMessage ? 'text-white/70' : 'text-slate-400 dark:text-slate-400'
            }`}>
              {formatFileSize(attachment.size)} • Document
            </p>
          </div>

          <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
            isOwnMessage 
              ? 'hover:bg-white/20 text-white' 
              : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400'
          }`}>
            <Download className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && createPortal(
        <div 
          className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 font-sans"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download ({formatFileSize(attachment.size)})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div 
            className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={attachment.url} 
              alt={attachment.name}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
              referrerPolicy="no-referrer"
            />
            <p className="mt-3 text-white/80 text-xs font-medium text-center truncate max-w-lg">
              {attachment.name} • {formatFileSize(attachment.size)}
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
