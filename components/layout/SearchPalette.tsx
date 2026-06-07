'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Loader2, 
  Sparkles, 
  BookOpen, 
  ClipboardList, 
  MessageSquare, 
  Gift, 
  ArrowRight, 
  CornerDownLeft, 
  X, 
  ArrowLeft, 
  Clock, 
  User,
  Activity
} from 'lucide-react';

interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchPalette: React.FC<SearchPaletteProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    features: [] as any[],
    surveys: [] as any[],
    posts: [] as any[],
    blogs: [] as any[],
    rewards: [] as any[],
  });
  
  const [activeArticle, setActiveArticle] = useState<any | null>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setQuery('');
      setDebouncedQuery('');
      setActiveArticle(null);
      setResults({ features: [], surveys: [], posts: [], blogs: [], rewards: [] });
    }
  }, [isOpen]);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults({ features: [], surveys: [], posts: [], blogs: [], rewards: [] });
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const json = await res.json();
          setResults(json.data);
        }
      } catch (err) {
        console.error('Failed to search:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  // Close palette on Esc keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeArticle) {
          setActiveArticle(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, activeArticle]);

  const handleNavigate = (url: string) => {
    router.push(url);
    onClose();
  };

  const hasResults = 
    results.features.length > 0 ||
    results.surveys.length > 0 ||
    results.posts.length > 0 ||
    results.blogs.length > 0 ||
    results.rewards.length > 0;

  // Simple formatter helper for formatting markdown-like headings and bullets
  const formatArticleContent = (content: string) => {
    return content.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('##')) {
        return (
          <h2 key={idx} className="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">
            {trimmed.substring(2).trim()}
          </h2>
        );
      }
      if (trimmed.startsWith('###')) {
        return (
          <h3 key={idx} className="text-base font-bold text-slate-850 dark:text-slate-200 mt-4 mb-2">
            {trimmed.substring(3).trim()}
          </h3>
        );
      }
      if (trimmed.startsWith('-')) {
        return (
          <li key={idx} className="text-slate-650 dark:text-slate-350 ml-4 list-disc mb-1.5 leading-relaxed">
            {trimmed.substring(1).trim()}
          </li>
        );
      }
      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4"
          onClick={onClose}
        >
          
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm"
          />

          {/* Search Box Drawer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[75vh]"
          >
            
            {/* Header / Input controls */}
            {!activeArticle ? (
              <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-800/80 px-4 py-3.5">
                <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search pages, surveys, open forum posts, blog articles..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none focus:outline-none text-slate-900 dark:text-white placeholder-slate-450 dark:placeholder-slate-505 text-sm"
                />
                
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                ) : query ? (
                  <button onClick={() => setQuery('')} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-550 border border-slate-200/20 dark:border-slate-700">
                    ESC
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/80 px-4 py-3.5 bg-slate-50 dark:bg-slate-900/60">
                <button
                  onClick={() => setActiveArticle(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Search
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Content Display: Results or Reader */}
            <div className="flex-1 overflow-y-auto p-4 min-h-[150px]">
              
              {/* Blog Article Reader view */}
              {activeArticle ? (
                <div className="space-y-4 px-2 py-1 select-text">
                  <div className="border-b border-slate-100 dark:border-slate-800/60 pb-4 space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 dark:bg-primary-950/50 px-2.5 py-0.5 text-xs font-semibold text-primary-600 dark:text-primary-400">
                      <BookOpen className="h-3 w-3" />
                      {activeArticle.category}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                      {activeArticle.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-450 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {activeArticle.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {activeArticle.readTime}
                      </span>
                    </div>
                  </div>
                  
                  <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                    {formatArticleContent(activeArticle.content)}
                  </div>
                </div>
              ) : (
                
                // Normal search result layout
                <div className="space-y-6">
                  
                  {/* Default hint state when search box empty */}
                  {!query && (
                    <div className="text-center py-8 space-y-3">
                      <Sparkles className="h-8 w-8 text-primary-400/80 mx-auto animate-bounce" />
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350">
                          Omni-Search Terminal
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-normal">
                          Type above to instantly search across page navigation, survey forms, discussion posts, point rewards, and wellness guides.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center pt-2">
                        {['burnout', 'survey', 'mentorship', 'points', 'ergo'].map((term) => (
                          <button
                            key={term}
                            onClick={() => setQuery(term)}
                            className="text-[11px] font-semibold text-slate-600 dark:text-slate-450 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 px-2.5 py-1 rounded-xl hover:border-primary-400/50 hover:bg-primary-50/20 hover:text-primary-600 transition-colors"
                          >
                             &quot;{term}&quot;
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading overlay spinner */}
                  {loading && !hasResults && (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                      <span className="text-xs text-slate-500">Searching records...</span>
                    </div>
                  )}

                  {/* Empty state when no matches */}
                  {query && !loading && !hasResults && (
                    <div className="text-center py-10 space-y-1.5">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-350">No results found</p>
                      <p className="text-xs text-slate-500">We couldn&apos;t find anything matching &quot;{query}&quot;. Try checking your spelling or search terms.</p>
                    </div>
                  )}

                  {/* Results listing columns */}
                  {hasResults && (
                    <div className="space-y-5">
                      
                      {/* Category: Menus & Features */}
                      {results.features.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2.5">
                            Features & Pages
                          </h4>
                          <div className="space-y-1">
                            {results.features.map((item) => (
                              <button
                                key={item.title}
                                onClick={() => handleNavigate(item.url)}
                                className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-primary-50/60 dark:hover:bg-primary-950/20 border border-transparent hover:border-primary-200/20 transition-all duration-200 group"
                              >
                                <div className="flex gap-3 items-start">
                                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20">
                                    <Activity className="h-4.5 w-4.5" />
                                  </span>
                                  <div>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                      {item.title}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 leading-normal">
                                      {item.description}
                                    </div>
                                  </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Category: Wellness Blog & Guides */}
                      {results.blogs.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2.5">
                            Wellness Articles & Guides
                          </h4>
                          <div className="space-y-1">
                            {results.blogs.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => setActiveArticle(item)}
                                className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-primary-50/60 dark:hover:bg-primary-950/20 border border-transparent hover:border-primary-200/20 transition-all duration-200 group"
                              >
                                <div className="flex gap-3 items-start">
                                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
                                    <BookOpen className="h-4.5 w-4.5" />
                                  </span>
                                  <div>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                      {item.title}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 leading-normal">
                                      {item.excerpt}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-250/25 px-1.5 py-0.5 rounded-md">
                                    Read Guide
                                  </span>
                                  <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Category: Surveys */}
                      {results.surveys.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2.5">
                            Active Feedback Surveys
                          </h4>
                          <div className="space-y-1">
                            {results.surveys.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => handleNavigate(item.url)}
                                className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-primary-50/60 dark:hover:bg-primary-950/20 border border-transparent hover:border-primary-200/20 transition-all duration-200 group"
                              >
                                <div className="flex gap-3 items-start">
                                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500 dark:bg-pink-500/20">
                                    <ClipboardList className="h-4.5 w-4.5" />
                                  </span>
                                  <div>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                      {item.title}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 leading-normal">
                                      {item.description}
                                    </div>
                                  </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Category: Forum Posts */}
                      {results.posts.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2.5">
                            Forum Discussions
                          </h4>
                          <div className="space-y-1">
                            {results.posts.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => handleNavigate(item.url)}
                                className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-primary-50/60 dark:hover:bg-primary-950/20 border border-transparent hover:border-primary-200/20 transition-all duration-200 group"
                              >
                                <div className="flex gap-3 items-start">
                                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-500/20">
                                    <MessageSquare className="h-4.5 w-4.5" />
                                  </span>
                                  <div>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                      Posted by {item.authorName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 leading-normal">
                                       &quot;{item.content}&quot;
                                    </div>
                                  </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Category: Point Vouchers / Rewards */}
                      {results.rewards.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2.5">
                            Konnect Vouchers & Rewards
                          </h4>
                          <div className="space-y-1">
                            {results.rewards.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => handleNavigate(item.url)}
                                className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-primary-50/60 dark:hover:bg-primary-950/20 border border-transparent hover:border-primary-200/20 transition-all duration-200 group"
                              >
                                <div className="flex gap-3 items-start">
                                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 dark:bg-purple-500/20">
                                    <Gift className="h-4.5 w-4.5" />
                                  </span>
                                  <div>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                      {item.label} ({item.cost} pts)
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 leading-normal">
                                      {item.description}
                                    </div>
                                  </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Footer keyboard controls bar */}
            {!activeArticle && (
              <div className="border-t border-slate-250/20 dark:border-slate-800/80 px-4 py-2 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <CornerDownLeft className="h-3 w-3 shrink-0" />
                    to select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">Esc</kbd>
                    to close
                  </span>
                </div>
                <div>
                  Search results automatically refreshed
                </div>
              </div>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
