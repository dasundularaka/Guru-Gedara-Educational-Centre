import React, { useEffect, useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { firestoreService } from '../lib/firestoreService';
import { SubjectItem, PathwayItem } from '../types';

export interface SubjectSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  allowCustom?: boolean;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  showLabel?: boolean;
  includePathways?: boolean;
  disabled?: boolean;
}

const DEFAULT_SUBJECT_TRACKS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Combined Mathematics",
  "English",
  "Coding",
  "Information Technology",
  "Commerce",
  "Accounting",
  "History"
];

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  value,
  onChange,
  label = "Subject Category / Track",
  placeholder = "Or type custom subject track...",
  required = false,
  allowCustom = true,
  className = "",
  selectClassName = "",
  inputClassName = "",
  labelClassName = "",
  showLabel = true,
  includePathways = true,
  disabled = false
}) => {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [pathways, setPathways] = useState<PathwayItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const unsubSubjects = firestoreService.subscribeSubjects((subList) => {
      if (isMounted) {
        setSubjects(subList || []);
        setLoading(false);
      }
    });

    let unsubPathways = () => {};
    if (includePathways) {
      unsubPathways = firestoreService.subscribePathways((pathList) => {
        if (isMounted) {
          setPathways(pathList || []);
        }
      });
    }

    return () => {
      isMounted = false;
      unsubSubjects();
      unsubPathways();
    };
  }, [includePathways]);

  // Combine subject names from DB, pathways from DB, default tracks, and current custom value
  const subjectOptions = Array.from(
    new Set([
      ...subjects.map(s => s.name),
      ...(includePathways ? pathways.map(p => p.title) : []),
      ...DEFAULT_SUBJECT_TRACKS,
      ...(value && value.trim() ? [value.trim()] : [])
    ])
  ).filter(Boolean);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <label className={`block text-[10px] font-bold text-gray-600 uppercase tracking-wider font-mono flex items-center gap-1.5 ${labelClassName}`}>
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="space-y-1.5">
        <div className="relative">
          <select
            disabled={disabled}
            required={required && !value}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full text-xs px-3 py-2 border border-gray-200 bg-white rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-bold text-gray-800 transition-all ${
              disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
            } ${selectClassName}`}
          >
            <option value="">
              {loading ? "-- Loading subjects from database... --" : "-- Select Subject from Central Database --"}
            </option>
            {subjectOptions.map((subjName) => (
              <option key={subjName} value={subjName}>
                {subjName}
              </option>
            ))}
          </select>
        </div>

        {allowCustom && (
          <div className="relative">
            <input
              type="text"
              disabled={disabled}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={`w-full text-[11px] px-3 py-1.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-medium text-gray-700 bg-gray-50/50 transition-all ${
                disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
              } ${inputClassName}`}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
              <Sparkles className="w-3 h-3 text-blue-400/60" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectSelector;
