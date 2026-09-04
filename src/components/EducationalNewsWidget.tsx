import React, { useState, useEffect, useRef } from 'react';
import { 
  Newspaper, 
  ExternalLink, 
  RefreshCw, 
  Sparkles, 
  Search, 
  Calendar, 
  Globe, 
  AlertCircle, 
  Tag, 
  ChevronRight,
  Clock,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface EducationalNewsArticle {
  id: string;
  title: string;
  summary: string;
  category: 'Exam Alert' | 'Curriculum' | 'University & Higher Ed' | 'STEM & Innovation' | 'Scholarship' | 'General Education' | string;
  date: string;
  source: string;
  sourceUrl?: string;
  urgency?: 'high' | 'medium' | 'info';
}

interface NewsApiResponse {
  success: boolean;
  grounded: boolean;
  source?: string;
  queries?: string[];
  items: EducationalNewsArticle[];
  lastUpdated?: string;
  message?: string;
}

export const EducationalNewsWidget: React.FC<{
  className?: string;
  compact?: boolean;
}> = ({ className = '', compact = false }) => {
  const [news, setNews] = useState<EducationalNewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isGrounded, setIsGrounded] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedArticle, setSelectedArticle] = useState<EducationalNewsArticle | null>(null);
  const clientCacheRef = useRef<Record<string, { items: EducationalNewsArticle[]; isGrounded: boolean; queries: string[]; lastUpdated: string }>>({});

  const categories = [
    { id: 'all', label: 'All Updates' },
    { id: 'Exam Alert', label: 'Exam Alerts' },
    { id: 'University & Higher Ed', label: 'University & UGC' },
    { id: 'Curriculum', label: 'Curriculum & Syllabi' },
    { id: 'STEM & Innovation', label: 'STEM & Competitions' },
    { id: 'Scholarship', label: 'Scholarships' },
  ];

  const fetchNews = async (category = 'all', force = false) => {
    // Check client-side cache first if not explicitly forcing a refresh
    if (!force && clientCacheRef.current[category]) {
      const cached = clientCacheRef.current[category];
      setNews(cached.items);
      setIsGrounded(cached.isGrounded);
      setSearchQueries(cached.queries);
      setLastUpdated(cached.lastUpdated);
      setLoading(false);
      return;
    }

    try {
      if (force) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await fetch(`/api/educational-news?category=${encodeURIComponent(category)}&refresh=${force ? 'true' : 'false'}`);
      if (res.ok) {
        const data: NewsApiResponse = await res.json();
        if (data.items && Array.isArray(data.items)) {
          setNews(data.items);
          setIsGrounded(!!data.grounded);
          setSearchQueries(data.queries || []);
          const updatedTime = data.lastUpdated || new Date().toISOString();
          setLastUpdated(updatedTime);

          // Store in client cache
          clientCacheRef.current[category] = {
            items: data.items,
            isGrounded: !!data.grounded,
            queries: data.queries || [],
            lastUpdated: updatedTime
          };
        }
      }
    } catch (err) {
      console.warn("Failed to load search-grounded educational news:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews(selectedCategory, false);
  }, [selectedCategory]);

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Exam Alert':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'University & Higher Ed':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'STEM & Innovation':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Curriculum':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Scholarship':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div 
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4 ${className}`}
      id="student_educational_news_widget"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Newspaper className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Academic & Educational Briefings
                {isGrounded ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                    <Sparkles className="w-3 h-3 text-emerald-500" /> Grounded with Live Search
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                    <BookOpen className="w-3 h-3 text-indigo-500" /> Official Academy Feed
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                Verified national examination schedules, university entrance bulletins, and academic alerts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchNews(selectedCategory, true)}
            disabled={isRefreshing || loading}
            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Fetch real-time updates from web search"
            id="btn_refresh_educational_news"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Refresh Live</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs italic">
          No announcements found for this category at the moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {news.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ y: -2 }}
              className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800 transition-all flex flex-col justify-between cursor-pointer space-y-2.5 group"
              onClick={() => setSelectedArticle(item)}
              id={`news_article_${item.id}`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {item.date}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {item.title}
                </h4>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {item.summary}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-750 text-[10.5px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 truncate max-w-[180px]">
                  <Globe className="w-3 h-3 text-indigo-500 shrink-0" />
                  {item.source}
                </span>

                <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform shrink-0">
                  Read briefing <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getCategoryColor(selectedArticle.category)}`}>
                {selectedArticle.category}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Published {selectedArticle.date}
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                {selectedArticle.title}
              </h3>

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                {selectedArticle.summary}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <span>Authority / Source: <strong className="text-slate-900 dark:text-white">{selectedArticle.source}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {selectedArticle.sourceUrl && (
                <a
                  href={selectedArticle.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  id="btn_visit_news_source"
                >
                  <span>Visit Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
