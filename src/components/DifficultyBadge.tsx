import React from 'react';
import { QuizDifficulty, Quiz } from '../types';
import { Sparkles, TrendingUp, Flame } from 'lucide-react';

export const getQuizDifficulty = (quiz: Partial<Quiz>): QuizDifficulty => {
  if (quiz.difficulty === 'beginner' || quiz.difficulty === 'intermediate' || quiz.difficulty === 'advanced') {
    return quiz.difficulty;
  }
  // Adaptive classification
  const passing = quiz.passingScorePercentage ?? 50;
  const qCount = quiz.questions?.length ?? 0;
  const duration = quiz.durationMinutes ?? 15;

  if (passing >= 75 || qCount >= 8 || duration >= 30) {
    return 'advanced';
  }
  if (passing <= 45 || qCount <= 3 || (duration > 0 && duration <= 10)) {
    return 'beginner';
  }
  return 'intermediate';
};

interface DifficultyBadgeProps {
  difficulty?: QuizDifficulty;
  quiz?: Partial<Quiz>;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({
  difficulty,
  quiz,
  size = 'xs',
  showIcon = true,
  className = ''
}) => {
  const diff = difficulty || (quiz ? getQuizDifficulty(quiz) : 'intermediate');

  const configs = {
    beginner: {
      label: 'Beginner',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      dotClass: 'bg-emerald-500',
      Icon: Sparkles,
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    intermediate: {
      label: 'Intermediate',
      bgClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      dotClass: 'bg-amber-500',
      Icon: TrendingUp,
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    advanced: {
      label: 'Advanced',
      bgClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      dotClass: 'bg-purple-500',
      Icon: Flame,
      iconColor: 'text-purple-600 dark:text-purple-400'
    }
  };

  const config = configs[diff] || configs.intermediate;
  const IconComponent = config.Icon;

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-xs gap-1.5'
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase rounded-full border shadow-2xs shrink-0 select-none ${sizeClasses[size]} ${config.bgClass} ${className}`}
      id={`difficulty_badge_${diff}`}
      title={`Difficulty Level: ${config.label}`}
    >
      {showIcon && <IconComponent className={`${size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${config.iconColor}`} />}
      <span>{config.label}</span>
    </span>
  );
};
