'use client';

import React, { useState } from 'react';
import { Recognition, BadgeType } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardBody, Avatar, Badge, Button } from '@/components/ui';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Heart, MessageSquare, ArrowRight, CornerDownRight, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecognitionCardProps {
  recognition: Recognition;
  onLike: (id: string) => void;
  onAddComment: (recId: string, content: string) => void;
}

export const RecognitionCard: React.FC<RecognitionCardProps> = ({
  recognition,
  onLike,
  onAddComment,
}) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const BADGES: Record<BadgeType, { emoji: string; color: string; label: string }> = {
    Excellence:      { emoji: '🏆', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40', label: 'Excellence' },
    Innovation:      { emoji: '💡', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40', label: 'Innovation' },
    Teamwork:        { emoji: '🤝', color: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900/40', label: 'Teamwork' },
    Leadership:      { emoji: '⭐', color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40', label: 'Leadership' },
    AboveAndBeyond:  { emoji: '💪', color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/40', label: 'Above & Beyond' },
    ProblemSolver:   { emoji: '🎯', color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40', label: 'Problem Solver' },
  };

  const currentBadge = BADGES[recognition.badge];

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(recognition.id, commentText);
    setCommentText('');
  };

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-visible">
      <CardBody className="p-5 space-y-4">
        
        {/* Header: Sender recognized Recipient */}
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            {/* Sender */}
            <div className="flex items-center gap-1.5">
              <Avatar name={recognition.sender.name} src={recognition.sender.avatarUrl} size="sm" />
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                {recognition.sender.name}
              </span>
            </div>

            <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />

            {/* Recipient */}
            <div className="flex items-center gap-1.5">
              <Avatar name={recognition.recipient.name} src={recognition.recipient.avatarUrl} size="sm" />
              <div className="flex flex-col">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-none">
                  {recognition.recipient.name}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase">
                  {recognition.recipient.department}
                </span>
              </div>
            </div>
          </div>

          <span className="text-[10px] text-slate-400 shrink-0">
            {formatDistanceToNow(parseISO(recognition.createdAt))} ago
          </span>
        </div>

        {/* Badge Banner */}
        <div className="flex pt-1">
          <Badge className={`text-xs py-1 px-3 border font-bold flex items-center gap-1.5 ${currentBadge?.color}`}>
            <span>{currentBadge?.emoji}</span>
            <span>{currentBadge?.label} Badge</span>
          </Badge>
        </div>

        {/* Message content */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50/60 dark:bg-slate-900/40 p-4 border border-slate-100 dark:border-slate-800/40 rounded-2xl">
          {recognition.message}
        </p>

        {/* Optional attachment image */}
        {recognition.attachmentUrl && (
          <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-40 w-auto inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={recognition.attachmentUrl} alt="Kudos Attachment" className="object-cover max-h-40 w-auto" />
          </div>
        )}

        {/* Likes / Comments buttons */}
        <div className="flex items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/40">
          <button
            onClick={() => onLike(recognition.id)}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all focus:outline-none ${
              recognition.likedByUser
                ? 'text-rose-600'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <motion.span whileTap={{ scale: 1.25 }}>
              <Heart
                className={`h-4.5 w-4.5 ${
                  recognition.likedByUser ? 'fill-rose-600 text-rose-600' : 'text-slate-400'
                }`}
              />
            </motion.span>
            <span>{recognition.likeCount} Likes</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1.5 text-xs font-bold transition-colors focus:outline-none ${
              showComments
                ? 'text-primary-600'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-4.5 w-4.5" />
            <span>{recognition.comments.length} Comments</span>
          </button>
        </div>

        {/* Collapsed comments thread */}
        {showComments && (
          <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800/40">
            {/* Comment list */}
            {recognition.comments.length > 0 && (
              <div className="space-y-3 pl-2">
                {recognition.comments.map((comm) => (
                  <div key={comm.id} className="flex gap-2 items-start">
                    <Avatar name={comm.author.name} size="xs" />
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl p-2.5 text-xs border border-slate-100 dark:border-slate-800/40">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{comm.author.name}</span>
                        <span className="text-[9px] text-slate-400">{formatDistanceToNow(parseISO(comm.createdAt))} ago</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{comm.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center">
              <Avatar name={user?.name || 'User'} size="xs" className="shrink-0" />
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <Button type="submit" size="sm" disabled={!commentText.trim()} className="p-1.5 rounded-xl">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        )}

      </CardBody>
    </Card>
  );
};
