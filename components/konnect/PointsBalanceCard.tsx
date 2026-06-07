'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardBody, Badge } from '@/components/ui';
import { Coins, Flame, Award, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface PointsBalanceCardProps {
  balance: number;
  streak: number;
}

export const PointsBalanceCard: React.FC<PointsBalanceCardProps> = ({ balance, streak }) => {
  const [animatedBalance, setAnimatedBalance] = useState(0);

  // Milestone targets
  const nextMilestone = 250;
  const progressPercent = Math.min((balance / nextMilestone) * 100, 100);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / 1200, 1);
      setAnimatedBalance(Math.floor(progress * balance));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [balance]);

  return (
    <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 dark:from-slate-900 dark:to-slate-950 text-white border-none shadow-lg relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-white/5 to-transparent pointer-events-none" />

      <CardBody className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        
        {/* Left Side: Score & Streaks */}
        <div className="space-y-4 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/10 text-white border-none py-1 px-2.5 font-bold flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-400 fill-orange-400" />
              <span>🔥 {streak}-Day Active Streak</span>
            </Badge>
            
            <Badge className="bg-white/10 text-white border-none py-1 px-2.5 font-bold flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-yellow-400" />
              <span>Wellness Champion</span>
            </Badge>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-200/80 uppercase tracking-wider block">
              Konnect Rewards Balance
            </span>
            <div className="flex items-baseline gap-2.5">
              <span className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
                {animatedBalance}
              </span>
              <span className="text-sm text-indigo-200 font-bold uppercase tracking-wider">Points Available</span>
            </div>
          </div>
        </div>

        {/* Right Side: Milestone Progress bar */}
        <div className="w-full md:max-w-xs space-y-2 shrink-0">
          <div className="flex justify-between text-xs font-semibold text-indigo-200">
            <span>Next Milestone: {nextMilestone} pts</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>

          <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-amber-400 to-yellow-300 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>

          <p className="text-[10px] text-indigo-200/70 leading-normal">
            Earn {nextMilestone - balance > 0 ? nextMilestone - balance : 0} more points to unlock a Leadership Chat reward!
          </p>
        </div>

      </CardBody>
    </Card>
  );
};
