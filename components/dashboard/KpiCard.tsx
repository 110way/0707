'use client';

import React from 'react';
import { Card, CardBody } from '@/components/ui';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: number | string;
  trend?: number; // percentage change vs last period
  icon: LucideIcon;
  color: 'blue' | 'green' | 'amber' | 'red';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  trend,
  icon: Icon,
  color,
}) => {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-600 dark:bg-blue-950/45 dark:text-blue-400',
    green: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:bg-amber-950/45 dark:text-amber-400',
    red: 'bg-rose-500/10 text-rose-600 dark:bg-rose-950/45 dark:text-rose-400',
  };

  const isPositiveTrend = trend && trend >= 0;

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
      <CardBody className="p-5 flex items-center justify-between gap-4">
        
        {/* Left Side: Labels & Scores */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {label}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {value}
            </span>
            {trend !== undefined && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold rounded px-1.5 py-0.5 ${
                isPositiveTrend 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
              }`}>
                {isPositiveTrend ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Icon */}
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </span>

      </CardBody>
    </Card>
  );
};
