import React, { useRef, useState } from 'react';
import { Paperclip, Image as ImageIcon, X, Loader2, FileText, AlertCircle } from 'lucide-react';
import { ChatAttachment } from '../types';
import { firestoreService } from '../lib/firestoreService';
import { formatFileSize, getFileIcon } from './ChatAttachmentViewer';

interface ChatAttachmentInputProps {
  currentUserId: string;
  attachments: ChatAttachment[];
  onAttachmentsChange: (attachments: ChatAttachment[]) => void;
  disabled?: boolean;
}

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  previewUrl?: string;
  error?: string;
}

export const ChatAttachmentInput: React.FC<ChatAttachmentInputProps> = ({
  currentUserId,
  attachments,
  onAttachmentsChange,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const handleFilesSelected = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0 || disabled) return;

    const files = Array.from(filesList);
    // Reset file input value so re-selecting same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    for (const file of files) {
      // Limit 25MB max
      if (file.size > 25 * 1024 * 1024) {
        alert(`"${file.name}" exceeds the maximum allowed upload size of 25MB.`);
        continue;
      }

      const tempId = `up_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

      const newUploadItem: UploadingFile = {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 10,
        previewUrl
      };

      setUploadingFiles(prev => [...prev, newUploadItem]);

      try {
        const uploaded = await firestoreService.uploadChatAttachment(
          file,
          currentUserId,
          (prog) => {
            setUploadingFiles(prev => 
              prev.map(item => item.id === tempId ? { ...item, progress: prog } : item)
            );
          }
        );

        // Remove from uploading queue and add to attachments list
        setUploadingFiles(prev => prev.filter(item => item.id !== tempId));
        onAttachmentsChange([...attachments, uploaded]);
      } catch (err: any) {
        console.error("Upload attachment error:", err);
        setUploadingFiles(prev => 
          prev.map(item => item.id === tempId ? { ...item, error: 'Upload failed', progress: 0 } : item)
        );
      }
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    onAttachmentsChange(attachments.filter((_, idx) => idx !== indexToRemove));
  };

  const removeUploading = (idToRemove: string) => {
    setUploadingFiles(prev => prev.filter(item => item.id !== idToRemove));
  };

  const isUploading = uploadingFiles.length > 0;

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
        disabled={disabled}
        id="input_chat_file_upload"
      />

      {/* Attachments & Uploading Preview Tray */}
      {(attachments.length > 0 || uploadingFiles.length > 0) && (
        <div className="flex items-center gap-2 p-2 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl mb-2 overflow-x-auto border border-slate-200 dark:border-slate-700">
          {/* Successfully uploaded attachments ready to send */}
          {attachments.map((att, idx) => (
            <div 
              key={`att_${idx}`}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 shrink-0 shadow-2xs group relative"
            >
              {att.fileType === 'image' ? (
                <img 
                  src={att.url} 
                  alt={att.name} 
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-black/10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0">
                  {getFileIcon(att.type, att.name)}
                </div>
              )}
              <div className="max-w-[120px]">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none">
                  {att.name}
                </p>
                <p className="text-[9px] font-mono text-slate-400">
                  {formatFileSize(att.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* In-progress uploading files */}
          {uploadingFiles.map((up) => (
            <div 
              key={up.id}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 shrink-0"
            >
              {up.previewUrl ? (
                <img 
                  src={up.previewUrl} 
                  alt={up.name} 
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-indigo-300 opacity-70"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                  {getFileIcon(up.type, up.name)}
                </div>
              )}

              <div className="max-w-[120px]">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none">
                  {up.name}
                </p>
                {up.error ? (
                  <span className="text-[9px] text-rose-500 font-bold flex items-center gap-0.5">
                    <AlertCircle className="w-2.5 h-2.5" /> Failed
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-14 h-1.5 bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 transition-all duration-200" 
                        style={{ width: `${up.progress}%` }} 
                      />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {up.progress}%
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeUploading(up.id)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Button to open attachment selector */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className="p-2.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center relative"
        title="Attach image or document (Firebase Storage)"
        id="btn_attach_chat_file"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
        ) : (
          <Paperclip className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
