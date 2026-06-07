'use client';

import React, { useState } from 'react';
import { PointsLogEntry } from '@/types';
import { Card, CardHeader, CardBody, CardTitle, Badge } from '@/components/ui';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { History, PlusCircle, MinusCircle, Coins } from 'lucide-react';

interface PointsHistoryProps {
  logs: PointsLogEntry[];
}

export const PointsHistory: React.FC<PointsHistoryProps> = ({ logs }) => {
  const [visibleCount, setVisibleCount] = useState(6);

  const displayedLogs = logs.slice(0, visibleCount);

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-100 dark:border-slate-800/50">
        <History className="h-4.5 w-4.5 text-primary-500" />
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Points Activity History
        </CardTitle>
      </CardHeader>
      <CardBody className="p-4 md:p-6 space-y-4">
        
        {displayedLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <Coins className="h-10 w-10 mx-auto text-slate-200 mb-2" />
            No points logged yet.
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200 dark:before:bg-slate-800">
            {displayedLogs.map((entry) => {
              const isEarning = entry.delta > 0;
              return (
                <div key={entry.id} className="flex gap-4 items-start relative pl-8">
                  {/* Bullet indicator */}
                  <span className={`absolute left-1.5 top-1.5 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${
                    isEarning ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />

                  {/* Body details */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {entry.activity}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {formatDistanceToNow(parseISO(entry.createdAt))} ago
                      </span>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      {/* Delta */}
                      <Badge
                        variant={isEarning ? 'success' : 'danger'}
                        className="font-bold px-2 py-0.5"
                      >
                        {isEarning ? `+${entry.delta}` : entry.delta} pts
                      </Badge>

                      {/* Balance After */}
                      <span className="text-[10px] font-bold text-slate-400">
                        Bal: {entry.balanceAfter} pts
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More button */}
        {logs.length > visibleCount && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setVisibleCount((prev) => prev + 5)}
              className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
            >
              Load more activity ({logs.length - visibleCount} remaining)
            </button>
          </div>
        )}

      </CardBody>
    </Card>
  );
};
