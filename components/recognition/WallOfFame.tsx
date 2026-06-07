'use client';

import React, { useState, useEffect, useRef } from 'react';
import { WallOfFameEntry, BadgeType } from '@/types';
import { Avatar, Badge, Card, CardBody } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Trophy, Quote, Sparkles } from 'lucide-react';

interface WallOfFameProps {
  entries: WallOfFameEntry[];
}

export const WallOfFame: React.FC<WallOfFameProps> = ({ entries }) => {
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const BADGES: Record<BadgeType, { emoji: string; color: string; label: string }> = {
    Excellence:      { emoji: '🏆', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40', label: 'Excellence' },
    Innovation:      { emoji: '💡', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40', label: 'Innovation' },
    Teamwork:        { emoji: '🤝', color: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900/40', label: 'Teamwork' },
    Leadership:      { emoji: '⭐', color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40', label: 'Leadership' },
    AboveAndBeyond:  { emoji: '💪', color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/40', label: 'Above & Beyond' },
    ProblemSolver:   { emoji: '🎯', color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40', label: 'Problem Solver' },
  };

  const nextSlide = () => {
    setIndex((prev) => (prev + 1) % entries.length);
  };

  const prevSlide = () => {
    setIndex((prev) => (prev - 1 + entries.length) % entries.length);
  };

  // Setup auto rotation
  useEffect(() => {
    if (!isHovered) {
      timerRef.current = setInterval(nextSlide, 3500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered]);

  const current = entries[index];
  if (!current) return null;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full max-w-4xl mx-auto select-none"
    >
      
      {/* Slide Transition Wrapper */}
      <div className="overflow-hidden min-h-[220px] md:min-h-[240px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.employee.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <Card className={`overflow-hidden border-2 shadow-md ${
              current.isEmployeeOfMonth 
                ? 'border-amber-400 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 dark:border-amber-500/40' 
                : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900'
            }`}>
              <CardBody className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                
                {/* Left side: Profile Spotlight */}
                <div className="relative shrink-0 flex flex-col items-center">
                  <Avatar 
                    name={current.employee.name} 
                    src={current.employee.avatarUrl} 
                    size="xl" 
                    className={current.isEmployeeOfMonth ? 'ring-4 ring-amber-400/35' : ''}
                  />

                  {current.isEmployeeOfMonth && (
                    <span className="absolute -top-3 -right-2 bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wide flex items-center gap-0.5 shadow-sm border border-amber-300">
                      <Trophy className="h-2.5 w-2.5" />
                      EOM
                    </span>
                  )}
                </div>

                {/* Right side: Recognition text */}
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="space-y-1">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {current.employee.name}
                      </h3>
                      <Badge variant="primary" className="text-[10px] py-0 px-2 uppercase self-center md:self-auto font-bold">
                        {current.employee.department}
                      </Badge>
                      <Badge className={`text-[10px] py-0 px-2 font-bold flex items-center gap-1 self-center md:self-auto border ${BADGES[current.topBadge]?.color}`}>
                        <span>{BADGES[current.topBadge]?.emoji}</span>
                        <span>Top Badge: {BADGES[current.topBadge]?.label}</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      Received <span className="font-extrabold text-slate-800 dark:text-slate-200">{current.recognitionCount} kudos</span> this month
                    </p>
                  </div>

                  {/* Quote content details */}
                  <div className="relative p-4 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                    <Quote className="absolute -top-2.5 -left-1.5 h-6 w-6 text-slate-200 dark:text-slate-800 shrink-0" />
                    <p className="text-xs italic text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-3">
                      &quot;{current.quote}&quot;
                    </p>
                  </div>
                </div>

              </CardBody>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Manual Arrow Nav buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-1 md:-left-12 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-md text-slate-500 hover:text-slate-800 transition-colors z-20"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-1 md:-right-12 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-md text-slate-500 hover:text-slate-800 transition-colors z-20"
        aria-label="Next Slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-1.5 pt-4">
        {entries.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === idx ? 'w-6 bg-primary-600' : 'w-2 bg-slate-300 dark:bg-slate-800'
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>

    </div>
  );
};
