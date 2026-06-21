import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile } from '../types';
import { TutorCard } from '../components/TutorCard';
import { Search, GraduationCap, Users } from 'lucide-react';

export const Tutors: React.FC = () => {
  const { showToast } = useApp();
  const [tutorsList, setTutorsList] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTutors, setFilteredTutors] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const users = await firestoreService.getAllUsers();
        const tutors = users.filter(u => u.role === 'tutor');
        setTutorsList(tutors);
        setFilteredTutors(tutors);
      } catch (e) {
        showToast("Error retrieving tutors from Firestore database.", "error");
      }
    };
    fetchTutors();
  }, []);

  useEffect(() => {
    let result = [...tutorsList];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.tutorDetails?.bio.toLowerCase().includes(q) ||
        t.tutorDetails?.qualification.toLowerCase().includes(q) ||
        t.tutorDetails?.subjects.some(sub => sub.toLowerCase().includes(q))
      );
    }
    setFilteredTutors(result);
  }, [searchTerm, tutorsList]);

  return (
    <div className="bg-gray-50/50 min-h-screen py-10" id="faculty_search_viewport">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title */}
        <div className="mb-8">
          <span className="text-xs font-bold text-blue-600 font-mono uppercase tracking-widest block leading-none">Tuition Faculty</span>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight mt-3">Verified Academic Instructors</h1>
          <p className="text-xs text-gray-500 mt-1">Directly chat with Ivy league scholars and full stack programming tutors to align custom study goals.</p>
        </div>

        {/* Search controls */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-8 max-w-2xl">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search faculty by name, qualification credentials or subjects (e.g. Physics)..."
              className="w-full text-xs pl-9.5 pr-4 py-2.5 bg-gray-50/60 rounded-xl border border-gray-150 outline-none focus:border-blue-500 font-sans leading-none"
            />
          </div>
        </div>

        {/* Content list */}
        {filteredTutors.length === 0 ? (
          <div className="text-center py-12 max-w-sm mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm">
            <GraduationCap className="w-12 h-12 text-blue-200 mx-auto mb-3 animate-bounce" />
            <h3 className="text-sm font-bold text-blue-950">No verified Tutors active</h3>
            <p className="text-xs text-gray-400 mt-1">We couldn't spot any registered educators matching "{searchTerm}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => (
              <div key={tutor.uid}>
                <TutorCard tutor={tutor} />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
