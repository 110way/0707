'use client';

import React from 'react';
import { Post } from '@/types';
import { Card, CardHeader, CardBody, CardTitle, Avatar } from '@/components/ui';
import { Heart, Trophy } from 'lucide-react';

interface TopLikedWidgetProps {
  posts: Post[];
  onSelectPost: (id: string) => void;
}

export const TopLikedWidget: React.FC<TopLikedWidgetProps> = ({ posts, onSelectPost }) => {
  // Take top 5 posts sorted by likes
  const topPosts = [...posts]
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 5);

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2">
        <Trophy className="h-4.5 w-4.5 text-amber-500" />
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Top Liked Posts
        </CardTitle>
      </CardHeader>
      <CardBody className="p-4 space-y-3.5">
        
        {topPosts.map((post, idx) => (
          <div
            key={post.id}
            onClick={() => onSelectPost(post.id)}
            className="flex items-start justify-between gap-3 group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 p-1 rounded-xl transition-all"
          >
            <div className="flex gap-2">
              <Avatar name={post.author.name} size="xs" className="mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold group-hover:text-primary-600 transition-colors">
                  {post.author.name}
                </span>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-1 leading-snug">
                  {post.content}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-rose-500 text-[10px] font-bold">
              <Heart className="h-3 w-3 fill-rose-500" />
              <span>{post.likeCount}</span>
            </div>
          </div>
        ))}

      </CardBody>
    </Card>
  );
};
