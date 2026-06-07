'use client';

import React, { useState } from 'react';
import { Comment } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Button } from '@/components/ui';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Reply, CornerDownRight, Send } from 'lucide-react';

interface CommentThreadProps {
  comments: Comment[];
  postId: string;
  onAddComment: (content: string, parentId: string | null) => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ comments, postId, onAddComment }) => {
  const { user } = useAuth();
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [visibleCount, setVisibleCount] = useState(3);

  const handleAddTopComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(newCommentText, null);
    setNewCommentText('');
  };

  const handleAddReply = (parentId: string) => {
    if (!replyText.trim()) return;
    onAddComment(replyText, parentId);
    setReplyText('');
    setReplyTargetId(null);
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isReplyingThis = replyTargetId === comment.id;
    
    return (
      <div key={comment.id} className="space-y-2">
        {/* Comment Header / Content */}
        <div className={`flex gap-3 items-start ${isReply ? 'pl-6 border-l border-slate-100 dark:border-slate-800' : ''}`}>
          {isReply && <CornerDownRight className="h-4.5 w-4.5 text-slate-300 dark:text-slate-700 shrink-0 mt-0.5" />}
          <Avatar name={comment.author.name} size="xs" />
          
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {comment.author.name}
              </span>
              <span className="text-[10px] text-slate-400">
                {formatDistanceToNow(parseISO(comment.createdAt))} ago
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
              {comment.content}
            </p>
          </div>
        </div>

        {/* Actions Row */}
        {!isReply && (
          <div className="flex gap-4 items-center pl-10 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            <button
              onClick={() => {
                setReplyTargetId(isReplyingThis ? null : comment.id);
                setReplyText('');
              }}
              className="flex items-center gap-1 hover:text-primary-600 transition-colors"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
          </div>
        )}

        {/* Reply Input Box */}
        {isReplyingThis && (
          <div className="pl-10 pr-4 flex gap-2 items-center">
            <Avatar name={user?.name || 'User'} size="xs" className="shrink-0" />
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${comment.author.name}...`}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddReply(comment.id);
              }}
            />
            <Button
              size="sm"
              variant="primary"
              className="p-1.5 rounded-lg"
              onClick={() => handleAddReply(comment.id)}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Render nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3 mt-1.5">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  const topLevelComments = comments.filter(c => c.parentId === null);
  const displayedComments = topLevelComments.slice(0, visibleCount);

  return (
    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
      
      {/* Top level add comment form */}
      <form onSubmit={handleAddTopComment} className="flex gap-2 items-center">
        <Avatar name={user?.name || 'User'} size="xs" className="shrink-0" />
        <input
          type="text"
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!newCommentText.trim()}
          className="p-2 rounded-xl"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Render comments list */}
      {displayedComments.length > 0 && (
        <div className="space-y-4 pt-2">
          {displayedComments.map((c) => renderComment(c, false))}
        </div>
      )}

      {/* Load More buttons */}
      {topLevelComments.length > visibleCount && (
        <button
          onClick={() => setVisibleCount((prev) => prev + 3)}
          className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline pt-2"
        >
          Load more comments ({topLevelComments.length - visibleCount} remaining)
        </button>
      )}

    </div>
  );
};
