'use client';

import React from 'react';
import { Card, CardHeader, CardBody, CardTitle, Badge } from '@/components/ui';
import { Sparkles, AlertCircle, TrendingUp, CheckCircle, Info } from 'lucide-react';

interface Insight {
  type: string; // 'warning' | 'success' | 'info'
  text: string;
  category: string;
}

interface AIInsightsPanelProps {
  insights: Insight[];
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0" />;
      case 'success':
        return <TrendingUp className="h-4.5 w-4.5 text-emerald-500 shrink-0" />;
      default:
        return <Info className="h-4.5 w-4.5 text-blue-500 shrink-0" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-rose-100 dark:border-rose-950/20 bg-rose-50/20 dark:bg-rose-950/5 text-rose-800 dark:text-rose-400';
      case 'success':
        return 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-50/20 dark:bg-emerald-950/5 text-emerald-800 dark:text-emerald-400';
      default:
        return 'border-blue-100 dark:border-blue-950/20 bg-blue-50/20 dark:bg-blue-950/5 text-blue-800 dark:text-blue-400';
    }
  };

  return (
    <Card className="border-indigo-200 dark:border-indigo-950 bg-indigo-50/5 dark:bg-indigo-950/5 shadow-md">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-indigo-100/50 dark:border-indigo-950/50">
        <Sparkles className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
          AI & Aggregation Insights
        </CardTitle>
      </CardHeader>
      <CardBody className="p-5 space-y-3.5">
        
        {insights.map((ins, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 p-4 rounded-xl border text-xs leading-relaxed ${getBorderColor(
              ins.type
            )}`}
          >
            {getIcon(ins.type)}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold uppercase tracking-wide text-[9px] opacity-75">
                  {ins.category}
                </span>
              </div>
              <p className="font-medium">{ins.text}</p>
            </div>
          </div>
        ))}

      </CardBody>
    </Card>
  );
};
