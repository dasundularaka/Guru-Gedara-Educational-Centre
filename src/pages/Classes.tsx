import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ClassCard } from '../components/ClassCard';
import { Search, SlidersHorizontal, BookOpen, AlertCircle } from 'lucide-react';
import { ClassItem } from '../types';

interface ClassesProps {
  onNavigateTab: (tab: string) => void;
}

const SUBJECT_CATEGORIES = ["All Subjects", "Mathematics", "Physics", "English", "Coding"];

export const Classes: React.FC<ClassesProps> = ({ onNavigateTab }) => {
  const { classes, refreshClasses, cloudSync } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [sortBy, setSortBy] = useState("default");
  
  const [filteredClasses, setFilteredClasses] = useState<ClassItem[]>([]);

  useEffect(() => {
    refreshClasses();
  }, []);

  useEffect(() => {
    let result = [...classes];

    // 1. Subject filter
    if (selectedSubject !== "All Subjects") {
      result = result.filter(c => c.subject.toLowerCase() === selectedSubject.toLowerCase());
    }

    // 2. Search query filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(term) || 
        c.description.toLowerCase().includes(term) ||
        c.tutorName.toLowerCase().includes(term)
      );
    }

    // 3. Sorting logic
    if (sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "spots_left") {
      result.sort((a, b) => (a.maxSlots - a.bookedSlots) - (b.maxSlots - b.bookedSlots));
    }

    setFilteredClasses(result);
  }, [classes, searchTerm, selectedSubject, sortBy]);

  return (
    <div className="bg-slate-50/40 min-h-screen py-10" id="classes_search_viewport">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Banner Header */}
        <div className="mb-10">
          <span className="text-[10px] font-mono font-bold text-indigo-650 uppercase tracking-widest block leading-none">Subjects Catalog</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">Explore Tuition Classes</h1>
          <p className="text-xs text-slate-500 mt-1.5">Book schedules, make secure mock payments, and begin custom sessions with top experts.</p>
        </div>

        {/* Filters and search blocks */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.01)] p-5 sm:p-7 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search classes by title, topic tags, or tutor name..."
                className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-sans"
              />
            </div>

            {/* Subject Selector */}
            <div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-slate-700 cursor-pointer"
              >
                {SUBJECT_CATEGORIES.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* Sort order Selector */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-slate-700 cursor-pointer"
              >
                <option value="default">Sort by: Default</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="spots_left">Available Seats Left</option>
              </select>
            </div>

          </div>

          {/* Quick pills */}
          <div className="flex gap-2 flex-wrap items-center mt-5 border-t border-slate-100 pt-5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Quick Filters:</span>
            {SUBJECT_CATEGORIES.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1 rounded-full border text-[11px] transition-all font-bold cursor-pointer ${
                  selectedSubject === sub 
                    ? 'bg-slate-900 text-white border-slate-900 font-extrabold shadow-sm' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Classes grid display */}
        {filteredClasses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-sm mx-auto shadow-sm">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-xs font-extrabold text-slate-900 font-sans">No matching entries</h3>
            <p className="text-xs text-slate-500 mt-2 pb-5 leading-relaxed">
              We couldn't spot any registered tuition class matched to: "{searchTerm || selectedSubject}".
            </p>
            <button
              onClick={() => { setSearchTerm(""); setSelectedSubject("All Subjects"); setSortBy("default"); }}
              className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Reset Search Parameters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((item) => (
              <div key={item.id} className="h-full">
                <ClassCard 
                  item={item} 
                  onBookSuccess={() => onNavigateTab('dashboard')}
                  onRedirectToLogin={() => onNavigateTab('auth')}
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
