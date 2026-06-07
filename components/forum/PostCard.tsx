'use client';

import React, { useState } from 'react';
import { Post, Comment } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardBody, Avatar, Badge, Button, Dropdown } from '@/components/ui';
import { CommentThread } from './CommentThread';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Heart, MessageSquare, Pin, Trash, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface PostCardProps {
  post: Post;
  comments: Comment[];
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onAddComment: (postId: string, content: string, parentId: string | null) => void;
  onSelectHashtag: (tag: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  comments,
  onLike,
  onDelete,
  onTogglePin,
  onAddComment,
  onSelectHashtag,
}) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isAdmin = user && user.role === 'admin';
  const isAuthor = user && user.id === post.author.id;
  const showMore = post.content.length > 300;
  
  // Format content output
  const displayedContent = isExpanded || !showMore
    ? post.content
    : `${post.content.slice(0, 300)}...`;

  const handleCommentSubmit = (content: string, parentId: string | null) => {
    onAddComment(post.id, content, parentId);
  };

  const dropdownItems = [];
  
  if (isAdmin) {
    dropdownItems.push({
      id: 'pin',
      label: post.isPinned ? 'Unpin Post' : 'Pin Post',
      onClick: () => onTogglePin(post.id),
      icon: <Pin className="h-4 w-4" />,
    });
  }

  if (isAuthor || isAdmin) {
    dropdownItems.push({
      id: 'delete',
      label: 'Delete Post',
      onClick: () => onDelete(post.id),
      icon: <Trash className="h-4 w-4" />,
      danger: true,
    });
  }

  return (
    <Card className={`border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-visible ${
      post.isPinned ? 'border-primary-400 dark:border-primary-800 bg-primary-50/5 dark:bg-primary-950/5' : ''
    }`}>
      
      {/* Pinned label */}
      {post.isPinned && (
        <div className="absolute top-3 right-12 flex items-center gap-1 text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
          <Pin className="h-3 w-3 fill-primary-600 dark:fill-primary-400" />
          <span>Pinned</span>
        </div>
      )}

      <CardBody className="p-5 space-y-4">
        
        {/* Author Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={post.author.name} src={post.author.avatarUrl} size="md" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {post.author.name}
                </span>
                <Badge className="text-[9px] uppercase tracking-wide py-0 px-1.5 font-bold">
                  {post.author.department}
                </Badge>
              </div>
              <span className="text-[10px] text-slate-400">
                {formatDistanceToNow(parseISO(post.createdAt))} ago
              </span>
            </div>
          </div>

          {dropdownItems.length > 0 && (
            <Dropdown
              align="right"
              trigger={
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg" aria-label="Post settings">
                  <MoreVertical className="h-4.5 w-4.5" />
                </button>
              }
              items={dropdownItems}
            />
          )}
        </div>

        {/* Content */}
        <div className="space-y-2.5">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {displayedContent}
            
            {showMore && !isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-primary-600 dark:text-primary-400 hover:underline font-semibold ml-1.5 focus:outline-none"
              >
                Show More
              </button>
            )}
            
            {isExpanded && showMore && (
              <button
                onClick={() => setIsExpanded(false)}
                className="text-primary-600 dark:text-primary-400 hover:underline font-semibold ml-1.5 focus:outline-none"
              >
                Show Less
              </button>
            )}
          </p>

          {/* Hashtag pills */}
          {post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {post.hashtags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onSelectHashtag(tag)}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline hover:bg-primary-50 dark:hover:bg-primary-950/20 px-2 py-0.5 rounded-lg transition-colors border border-transparent dark:border-transparent hover:border-primary-100 dark:hover:border-primary-900/30"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Image if attached */}
          {post.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-96 w-full mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt="Forum media attachment"
                className="object-cover w-full h-full max-h-96"
              />
            </div>
          )}
        </div>

        {/* Engagement Row */}
        <div className="flex items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/40">
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all focus:outline-none ${
              post.likedByUser
                ? 'text-rose-600'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <motion.span whileTap={{ scale: 1.25 }}>
              <Heart
                className={`h-4.5 w-4.5 ${
                  post.likedByUser ? 'fill-rose-600 text-rose-600' : 'text-slate-400'
                }`}
              />
            </motion.span>
            <span>{post.likeCount} Likes</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1.5 text-xs font-bold transition-colors focus:outline-none ${
              showComments
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-4.5 w-4.5" />
            <span>{post.commentCount} Comments</span>
          </button>
        </div>

        {/* Collapsed comments thread */}
        {showComments && (
          <CommentThread
            comments={comments}
            postId={post.id}
            onAddComment={handleCommentSubmit}
          />
        )}

      </CardBody>
    </Card>
  );
};
