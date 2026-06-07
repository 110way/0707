'use client';

import React from 'react';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui';
import { Hash, TrendingUp, X } from 'lucide-react';

interface HashtagSidebarProps {
  hashtags: { name: string; count: number }[];
  selectedHashtag: string | null;
  onSelectHashtag: (tag: string | null) => void;
}

export const HashtagSidebar: React.FC<HashtagSidebarProps> = ({
  hashtags,
  selectedHashtag,
  onSelectHashtag,
}) => {
  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2">
        <TrendingUp className="h-4.5 w-4.5 text-primary-500" />
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Trending Hashtags
        </CardTitle>
      </CardHeader>
      <CardBody className="p-4 space-y-2.5">
        
        {/* Selected Hashtag Banner */}
        {selectedHashtag && (
          <div className="flex items-center justify-between bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 px-3 py-2 rounded-xl text-xs font-bold border border-primary-100 dark:border-primary-900/30">
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {selectedHashtag.replace('#', '')}
            </span>
            <button
              onClick={() => onSelectHashtag(null)}
              className="hover:bg-primary-100 dark:hover:bg-primary-900 p-0.5 rounded transition-colors"
              aria-label="Clear hashtag filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* List of tags */}
        <div className="flex flex-col gap-1">
          {hashtags.map((tag) => {
            const isSelected = selectedHashtag === tag.name;
            return (
              <button
                key={tag.name}
                onClick={() => onSelectHashtag(isSelected ? null : tag.name)}
                className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors ${
                  isSelected
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Hash className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tag.name.replace('#', '')}</span>
                </span>
                <span className={`text-[10px] py-0.5 px-1.5 rounded-full ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {tag.count}
                </span>
              </button>
            );
          })}
        </div>

      </CardBody>
    </Card>
  );
};
