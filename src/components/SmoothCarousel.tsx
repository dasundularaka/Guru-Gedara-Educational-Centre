import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

interface ResponsiveBreakpoints {
  base?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

interface SmoothCarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
  itemsPerView?: ResponsiveBreakpoints;
  gap?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number; // ms, default 4500
  pauseOnHover?: boolean;
  className?: string;
  cardClassName?: string;
  showControls?: boolean;
  showDots?: boolean;
  arrowPosition?: 'header' | 'floating' | 'bottom';
  accentColor?: 'indigo' | 'blue' | 'slate' | 'emerald';
  emptyState?: React.ReactNode;
  onSlideChange?: (index: number) => void;
  renderCustomControls?: (controls: {
    currentIndex: number;
    maxIndex: number;
    total: number;
    next: () => void;
    prev: () => void;
    goTo: (idx: number) => void;
    isPaused: boolean;
    togglePlay: () => void;
    canPrev: boolean;
    canNext: boolean;
  }) => React.ReactNode;
}

export function SmoothCarousel<T>({
  items,
  renderItem,
  keyExtractor,
  itemsPerView = { base: 1, sm: 1, md: 2, lg: 3, xl: 3 },
  gap = 24,
  autoPlay = true,
  autoPlayInterval = 4500,
  pauseOnHover = true,
  className = '',
  cardClassName = '',
  showControls = true,
  showDots = true,
  arrowPosition = 'header',
  accentColor = 'indigo',
  emptyState,
  onSlideChange,
  renderCustomControls,
}: SmoothCarouselProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const isDraggingRef = useRef(false);

  // Responsive items count computation
  const [visibleCount, setVisibleCount] = useState(() => {
    if (typeof window === 'undefined') return itemsPerView.lg || 3;
    const w = window.innerWidth;
    if (w >= 1280) return itemsPerView.xl || itemsPerView.lg || 3;
    if (w >= 1024) return itemsPerView.lg || 3;
    if (w >= 768) return itemsPerView.md || itemsPerView.sm || 2;
    if (w >= 640) return itemsPerView.sm || 1;
    return itemsPerView.base || 1;
  });

  // Track window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      let count = itemsPerView.base || 1;
      if (w >= 1280) count = itemsPerView.xl || itemsPerView.lg || 3;
      else if (w >= 1024) count = itemsPerView.lg || 3;
      else if (w >= 768) count = itemsPerView.md || itemsPerView.sm || 2;
      else if (w >= 640) count = itemsPerView.sm || 1;
      
      setVisibleCount(count);

      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [itemsPerView]);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, [items.length, visibleCount]);

  const totalItems = items.length;
  const maxIndex = Math.max(0, totalItems - visibleCount);

  // Clamp current index if visibleCount or items change
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const goTo = useCallback((index: number) => {
    const target = Math.max(0, Math.min(index, maxIndex));
    setCurrentIndex(target);
    onSlideChange?.(target);
  }, [maxIndex, onSlideChange]);

  const next = useCallback(() => {
    if (totalItems <= visibleCount) return;
    setCurrentIndex((prev) => {
      const nextIdx = prev >= maxIndex ? 0 : prev + 1;
      onSlideChange?.(nextIdx);
      return nextIdx;
    });
  }, [totalItems, visibleCount, maxIndex, onSlideChange]);

  const prev = useCallback(() => {
    if (totalItems <= visibleCount) return;
    setCurrentIndex((prev) => {
      const prevIdx = prev <= 0 ? maxIndex : prev - 1;
      onSlideChange?.(prevIdx);
      return prevIdx;
    });
  }, [totalItems, visibleCount, maxIndex, onSlideChange]);

  const togglePlay = useCallback(() => {
    setIsPaused(p => !p);
  }, []);

  // Keyboard navigation when hovered
  useEffect(() => {
    if (!isHovered) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prev();
      } else if (e.key === 'ArrowRight') {
        next();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered, prev, next]);

  // Auto-play effect with hover detection
  useEffect(() => {
    if (!autoPlay || isPaused || (pauseOnHover && isHovered) || totalItems <= visibleCount) {
      return;
    }

    const timer = setInterval(() => {
      next();
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, isPaused, pauseOnHover, isHovered, totalItems, visibleCount, next]);

  if (totalItems === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  // Accent color variants
  const colorMap = {
    indigo: {
      activeDot: 'bg-indigo-600',
      activeBtn: 'text-indigo-600',
      hoverBtn: 'hover:bg-indigo-50 hover:text-indigo-700',
      borderActive: 'border-indigo-500'
    },
    blue: {
      activeDot: 'bg-blue-600',
      activeBtn: 'text-blue-600',
      hoverBtn: 'hover:bg-blue-50 hover:text-blue-700',
      borderActive: 'border-blue-500'
    },
    slate: {
      activeDot: 'bg-slate-900',
      activeBtn: 'text-slate-900',
      hoverBtn: 'hover:bg-slate-100 hover:text-slate-950',
      borderActive: 'border-slate-900'
    },
    emerald: {
      activeDot: 'bg-emerald-600',
      activeBtn: 'text-emerald-600',
      hoverBtn: 'hover:bg-emerald-50 hover:text-emerald-700',
      borderActive: 'border-emerald-500'
    }
  }[accentColor];

  const totalSteps = maxIndex + 1;

  // Custom Controls Provider
  const customControls = renderCustomControls ? renderCustomControls({
    currentIndex,
    maxIndex,
    total: totalItems,
    next,
    prev,
    goTo,
    isPaused,
    togglePlay,
    canPrev: totalItems > visibleCount,
    canNext: totalItems > visibleCount,
  }) : null;

  return (
    <div 
      className={`relative w-full select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="region"
      aria-label="Carousel"
    >
      {/* Custom Controls Header if passed */}
      {customControls}

      {/* Default Header Controls if selected */}
      {!customControls && showControls && arrowPosition === 'header' && totalItems > visibleCount && (
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5">
            {showDots && totalSteps > 1 && (
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 sm:p-1.5 rounded-full border border-slate-200/60 shadow-2xs">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    className={`carousel-dot h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      i === currentIndex 
                        ? `w-4 sm:w-6 ${colorMap.activeDot} shadow-xs` 
                        : 'w-1.5 sm:w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                    title={`Slide to view ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={prev}
              className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95 btn-compact"
              title="Previous"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95 btn-compact"
              title="Next"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Track Viewport Container with Smooth Spring & Drag Inertia */}
      <div 
        ref={containerRef}
        className="overflow-hidden relative w-full py-4 -my-4 px-1 -mx-1 touch-pan-y cursor-grab active:cursor-grabbing"
      >
        <motion.div
          className="flex items-stretch"
          drag={totalItems > visibleCount ? "x" : false}
          dragConstraints={{
            left: containerWidth ? -((totalItems - visibleCount) * (containerWidth / visibleCount)) : 0,
            right: 0
          }}
          dragElastic={0.12}
          onDragStart={() => { isDraggingRef.current = true; }}
          onDragEnd={(_, info) => {
            setTimeout(() => { isDraggingRef.current = false; }, 50);
            const offset = info.offset.x;
            const velocity = info.velocity.x;
            const threshold = 40;

            if (offset < -threshold || velocity < -300) {
              next();
            } else if (offset > threshold || velocity > 300) {
              prev();
            }
          }}
          animate={{
            x: `-${currentIndex * (100 / visibleCount)}%`,
          }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 28,
            mass: 0.65,
          }}
          style={{
            display: 'flex',
            willChange: 'transform',
          }}
        >
          {items.map((item, index) => {
            const key = keyExtractor ? keyExtractor(item, index) : index;
            const itemWidthPercent = 100 / visibleCount;

            return (
              <div
                key={key}
                className={`shrink-0 px-3 box-border flex flex-col ${cardClassName}`}
                style={{
                  width: `${itemWidthPercent}%`,
                }}
              >
                {renderItem(item, index)}
              </div>
            );
          })}
        </motion.div>

        {/* Floating Side Arrows */}
        {showControls && arrowPosition === 'floating' && totalItems > visibleCount && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-800 hover:bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-800 hover:bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95"
              title="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Dots & Controls if configured */}
      {showDots && arrowPosition !== 'header' && totalSteps > 1 && totalItems > visibleCount && (
        <div className="flex items-center justify-center gap-1.5 mt-4 sm:mt-6">
          <button
            type="button"
            onClick={prev}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer mr-1.5 sm:mr-2 active:scale-95 btn-compact"
            title="Previous"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 sm:p-1.5 rounded-full border border-slate-200/70 shadow-2xs">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={`carousel-dot h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === currentIndex 
                    ? `w-4 sm:w-6 ${colorMap.activeDot} shadow-xs` 
                    : 'w-1.5 sm:w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-1.5 sm:ml-2 active:scale-95 btn-compact"
            title="Next"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
