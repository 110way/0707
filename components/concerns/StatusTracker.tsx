'use client';

import React, { useState } from 'react';
import { Concern } from '@/types';
import { Card, CardBody, Badge, Button } from '@/components/ui';
import { Search, Eye, Calendar, Clock, Lock } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface StatusTrackerProps {
  onSearch: (refId: string) => Promise<Concern | undefined>;
}

export const StatusTracker: React.FC<StatusTrackerProps> = ({ onSearch }) => {
  const [refIdInput, setRefIdInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<Concern | undefined>(undefined);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refIdInput.trim()) return;
    const match = await onSearch(refIdInput.trim());
    setResult(match);
    setSearched(true);
  };

  const getStatusBadge = (status: Concern['status']) => {
    switch (status) {
      case 'Open': return <Badge variant="danger">Open</Badge>;
      case 'In Progress': return <Badge variant="warning">In Progress</Badge>;
      case 'Resolved': return <Badge variant="success">Resolved</Badge>;
      default: return <Badge variant="default">Unaddressed</Badge>;
    }
  };

  const getSeverityColor = (sev: Concern['severity']) => {
    switch (sev) {
      case 'Critical': return 'text-rose-500';
      case 'High': return 'text-orange-500';
      case 'Medium': return 'text-amber-500';
      default: return 'text-slate-400';
    }
  };

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm h-full">
      <CardBody className="p-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="h-5 w-5 text-indigo-500" />
            Track Your Concern
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Enter your 36-character reference ID to view the latest status update.
          </p>
        </div>

        {/* Search Input bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="e.g., 8fbd0291-a1dc-4921-965a-..."
              value={refIdInput}
              onChange={(e) => setRefIdInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button type="submit" size="sm" className="px-4 rounded-xl">
            Track
          </Button>
        </form>

        {/* Display Results */}
        {searched && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 animate-fadeIn space-y-4">
            {result ? (
              <div className="space-y-4">
                {/* Result header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">STATUS</span>
                  {getStatusBadge(result.status)}
                </div>

                {/* Info Fields */}
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-400">Category</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{result.category}</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-400">Severity</span>
                    <span className={`font-semibold ${getSeverityColor(result.severity)}`}>{result.severity}</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-400">Date Logged</span>
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(result.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-400">Last Active</span>
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDistanceToNow(parseISO(result.createdAt))} ago
                    </span>
                  </div>
                </div>

                {/* Anonymity Banner */}
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-100/40 dark:bg-slate-900/20 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40 uppercase tracking-wide">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Your identity is securely anonymized</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-rose-500 space-y-1 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider">Ticket Not Found</p>
                <p className="text-[10px] text-slate-500">Double check your tracking UUID. It must match exactly.</p>
              </div>
            )}
          </div>
        )}

      </CardBody>
    </Card>
  );
};
