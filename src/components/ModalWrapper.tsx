import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Maximum horizontal width constraint on desktop/tablets */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
  /** Custom max height class (defaults to responsive dvh/vh) */
  maxHeight?: string;
  /** Whether the modal should expand to true full screen */
  isFullscreen?: boolean;
  /** Additional classes for the backdrop container */
  backdropClassName?: string;
  /** Additional classes for the modal dialog content container */
  dialogClassName?: string;
  /** Unique HTML id for testing and accessibility targeting */
  id?: string;
  /** Accessible label */
  ariaLabel?: string;
  /** Close when tapping outer backdrop (defaults to true) */
  closeOnBackdropClick?: boolean;
  /** Close when pressing keyboard Escape key (defaults to true) */
  closeOnEsc?: boolean;
  /** Z-index class (defaults to z-50) */
  zIndex?: string;
  /** Render using createPortal into document.body (defaults to true) */
  renderInPortal?: boolean;
}

const MAX_WIDTH_MAP: Record<NonNullable<ModalWrapperProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-full'
};

export const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = '2xl',
  maxHeight = 'max-h-[92dvh] sm:max-h-[88vh]',
  isFullscreen = false,
  backdropClassName = '',
  dialogClassName = '',
  id,
  ariaLabel,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  zIndex = 'z-50',
  renderInPortal = true
}) => {
  // Lock body scroll when modal is open to prevent background bleed-through on touch & mobile screens
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div
          id={id ? `${id}_backdrop` : undefined}
          className={`fixed inset-0 ${zIndex} flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto overscroll-contain transition-all duration-200 ${backdropClassName}`}
          onClick={(e) => {
            if (closeOnBackdropClick && e.target === e.currentTarget) {
              onClose();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
        >
          <motion.div
            id={id}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col my-auto transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isFullscreen
                ? 'w-full h-full max-w-full max-h-full rounded-none m-0 inset-0'
                : `${MAX_WIDTH_MAP[maxWidth]} ${maxHeight} rounded-2xl sm:rounded-3xl`
            } ${dialogClassName}`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (renderInPortal && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};
