'use client';

import React, { useState } from 'react';
import { Card, CardBody, Button, Badge } from '@/components/ui';
import { Copy, Check, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ReferenceDisplayProps {
  referenceId: string;
  onReset: () => void;
}

export const ReferenceDisplay: React.FC<ReferenceDisplayProps> = ({ referenceId, onReset }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/10 dark:bg-emerald-950/5 max-w-md mx-auto text-center shadow-md">
      <CardBody className="p-8 space-y-6">
        
        {/* Checked icon indicator */}
        <div className="flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </span>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Concern Reported</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your ticket has been logged anonymously. The system has stripped all trace data.
          </p>
        </div>

        {/* Code display block */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Reference Tracking ID
          </span>
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-inner select-all">
            <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
              {referenceId}
            </code>
            <button
              onClick={copyToClipboard}
              className="shrink-0 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors border border-transparent dark:border-transparent hover:border-slate-200"
              aria-label="Copy code to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Danger Warning Alert */}
        <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 text-left text-xs leading-relaxed">
          <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Keep this ID safe!</span>
            <span>It is the only way to track progress. Admins cannot retrieve it for you if lost.</span>
          </div>
        </div>

        {/* Reset btn */}
        <Button variant="outline" fullWidth onClick={onReset} className="py-2.5 rounded-xl font-bold">
          Submit Another Concern
        </Button>

      </CardBody>
    </Card>
  );
};
