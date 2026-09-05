import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Check, CreditCard } from 'lucide-react';

interface SwipeToPayProps {
  amount: number;
  label?: string;
  onConfirm: () => void;
  disabled?: boolean;
}

export const SwipeToPay: React.FC<SwipeToPayProps> = ({
  amount,
  label = `Swipe to Pay LKR ${amount.toLocaleString()}`,
  onConfirm,
  disabled = false
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);

  const maxOffset = trackRef.current ? trackRef.current.clientWidth - 56 : 180;

  const handleStart = (clientX: number) => {
    if (disabled || isConfirmed) return;
    setIsDragging(true);
    startXRef.current = clientX - dragOffset;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || disabled || isConfirmed) return;
    const trackWidth = trackRef.current ? trackRef.current.clientWidth : 240;
    const thumbWidth = 52;
    const limit = Math.max(0, trackWidth - thumbWidth - 8);
    const newOffset = Math.min(Math.max(0, clientX - startXRef.current), limit);
    setDragOffset(newOffset);

    // Trigger confirmation when dragged > 80%
    if (newOffset >= limit * 0.82) {
      setIsDragging(false);
      setIsConfirmed(true);
      setDragOffset(limit);
      onConfirm();
    }
  };

  const handleEnd = () => {
    if (!isDragging || isConfirmed) return;
    setIsDragging(false);
    // Snap back if not reached threshold
    setDragOffset(0);
  };

  useEffect(() => {
    const onWindowTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };
    const onWindowTouchEnd = () => {
      if (isDragging) handleEnd();
    };
    const onWindowMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const onWindowMouseUp = () => {
      if (isDragging) handleEnd();
    };

    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onWindowTouchEnd);
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    return () => {
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowTouchEnd);
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isDragging, isConfirmed]);

  return (
    <div
      ref={trackRef}
      className={`relative w-full h-12 rounded-2xl overflow-hidden select-none transition-all ${
        isConfirmed
          ? 'bg-emerald-600 text-white shadow-md'
          : disabled
          ? 'bg-slate-150 text-slate-400 opacity-60'
          : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 border border-emerald-300 shadow-inner'
      }`}
    >
      {/* Background track text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
        {isConfirmed ? (
          <span className="text-xs font-black text-white flex items-center gap-1.5 animate-pulse">
            <Check className="w-4 h-4" /> Payment Staged
          </span>
        ) : (
          <span className="text-[11px] font-bold text-emerald-850 tracking-wide font-mono flex items-center gap-1">
            {label} <span className="opacity-60 text-xs">&rarr;&rarr;&rarr;</span>
          </span>
        )}
      </div>

      {/* Progress highlight filling behind thumb */}
      {!isConfirmed && (
        <div
          className="absolute left-0 top-0 bottom-0 bg-emerald-500/25 transition-all"
          style={{ width: `${dragOffset + 26}px` }}
        />
      )}

      {/* Draggable thumb slider */}
      {!isConfirmed && (
        <div
          style={{ transform: `translateX(${dragOffset}px)` }}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onMouseDown={(e) => handleStart(e.clientX)}
          className="absolute top-1 left-1 bottom-1 w-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing z-10 transition-transform duration-75"
        >
          <ArrowRight className="w-4 h-4 animate-pulse" />
        </div>
      )}
    </div>
  );
};
