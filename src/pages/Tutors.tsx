import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile } from '../types';
import { TutorCard } from '../components/TutorCard';
import { Search, GraduationCap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TUTOR_SUBJECT_FILTERS = ["All Subjects", "Mathematics", "Physics", "English", "Coding"];

export const Tutors: React.FC = () => {
  const { showToast } = useApp();
  const [tutorsList, setTutorsList] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [filteredTutors, setFilteredTutors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTutors = async () => {
      setLoading(true);
      try {
        const users = await firestoreService.getAllUsers();
        const tutors = users.filter(u => u.role === 'tutor' || !!u.tutorDetails);
        setTutorsList(tutors);
        setFilteredTutors(tutors);
      } catch (e) {
        showToast("Error retrieving tutors from database.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchTutors();
  }, []);

  useEffect(() => {
    let result = [...tutorsList];
    
    if (selectedSubject !== "All Subjects") {
      result = result.filter(t => 
        (t.tutorDetails?.subjects || []).some(sub => sub.toLowerCase().includes(selectedSubject.toLowerCase()))
      );
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => 
        (t.name || '').toLowerCase().includes(q) || 
        (t.username || '').toLowerCase().includes(q) ||
        (t.tutorDetails?.bio || '').toLowerCase().includes(q) ||
        (t.tutorDetails?.qualification || '').toLowerCase().includes(q) ||
        (t.tutorDetails?.subjects || []).some(sub => sub.toLowerCase().includes(q))
      );
    }
    setFilteredTutors(result);
  }, [searchTerm, selectedSubject, tutorsList]);

  return (
    <div className="bg-slate-50/50 min-h-screen py-6 sm:py-10" id="faculty_search_viewport">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 sm:mb-8"
        >
          <span className="text-xs font-bold text-indigo-600 font-mono uppercase tracking-widest block leading-none">Faculty Directory</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2 sm:mt-3">Verified Academic Faculty</h1>
          <p className="text-xs text-slate-500 mt-1">Connect directly with certified educators, book classes, and start direct chats.</p>
        </motion.div>

        {/* Search controls & Category chips */}
        <div className="space-y-3 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5 sm:p-4 max-w-2xl">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search faculty by name, qualification, or subject..."
                className="w-full text-xs pl-9 pr-8 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 font-sans transition-colors text-slate-900"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Subject Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {TUTOR_SUBJECT_FILTERS.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                  selectedSubject === sub 
                    ? 'bg-indigo-600 text-white shadow-xs font-extrabold' 
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-white rounded-2xl border border-slate-100 p-6 animate-pulse flex flex-col justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-slate-200 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-full"></div>
                  <div className="h-3 bg-slate-100 rounded w-4/5"></div>
                </div>
                <div className="h-8 bg-slate-100 rounded-xl w-full"></div>
              </div>
            ))}
          </div>
        ) : filteredTutors.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 max-w-sm mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm"
          >
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900">No faculty found</h3>
            <p className="text-xs text-slate-400 mt-1">No instructors match your current search criteria.</p>
          </motion.div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filteredTutors.map((tutor, idx) => (
                <motion.div 
                  key={tutor.uid}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <TutorCard tutor={tutor} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

      </div>
    </div>
  );
};
