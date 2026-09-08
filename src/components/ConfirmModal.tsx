import React from 'react';
import { AlertTriangle, Trash2, X, Loader2, Info } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  confirmBtnId?: string;
  cancelBtnId?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
  confirmBtnId = 'confirm_modal_btn',
  cancelBtnId = 'cancel_modal_btn'
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-600',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100 text-blue-600',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
          icon: <Info className="w-6 h-6 text-blue-600" />
        };
      case 'danger':
      default:
        return {
          iconBg: 'bg-red-100 text-red-600',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
          icon: <Trash2 className="w-6 h-6 text-red-600" />
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      maxWidth="md"
      ariaLabel={title}
      closeOnBackdropClick={!isLoading}
      closeOnEsc={!isLoading}
      dialogClassName="p-5 sm:p-6 overflow-y-auto overscroll-contain"
    >
      <button
        onClick={onClose}
        disabled={isLoading}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Close modal"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-3.5 sm:gap-4">
        <div className={`p-3 rounded-2xl shrink-0 ${styles.iconBg}`}>
          {styles.icon}
        </div>
        <div className="flex-1 pr-6 sm:pr-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-6">{title}</h3>
          <div className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {message}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
        <button
          id={cancelBtnId}
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50 min-h-[44px] flex items-center justify-center"
        >
          {cancelText}
        </button>
        <button
          id={confirmBtnId}
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 min-h-[44px] ${styles.confirmBtn}`}
        >
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {confirmText}
        </button>
      </div>
    </ModalWrapper>
  );
};

