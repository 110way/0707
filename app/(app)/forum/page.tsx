'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Post, Comment } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { usePoints } from '@/hooks/usePoints';
import { useToast } from '@/components/ui/Toast';
import { PostEditor } from '@/components/forum/PostEditor';
import { PostCard } from '@/components/forum/PostCard';
import { HashtagSidebar } from '@/components/forum/HashtagSidebar';
import { TopLikedWidget } from '@/components/forum/TopLikedWidget';
import { Tabs } from '@/components/ui';
import { MessageSquare, Search, Loader2 } from 'lucide-react';

export default function ForumPage() {
  const { user } = useAuth();
  const { updatePoints } = usePoints();
  const { toast } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [sortBy, setSortBy] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sorting option tabs
  const sortTabs = [
    { id: 'latest', label: 'Latest' },
    { id: 'likes', label: 'Most Liked' },
    { id: 'comments', label: 'Most Commented' },
  ];

  // Fetch comments for a list of posts
  const fetchCommentsForPosts = async (loadedPosts: Post[]) => {
    const map: Record<string, Comment[]> = {};
    await Promise.all(
      loadedPosts.map(async (p) => {
        try {
          const res = await fetch(`/api/posts/${p.id}/comments`);
          if (res.ok) {
            const json = await res.json();
            map[p.id] = json.data || [];
          }
        } catch (e) {
          console.error(`Error loading comments for post ${p.id}:`, e);
        }
      })
    );
    setCommentsMap(map);
  };

  // Fetch posts from API
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL('/api/posts', window.location.origin);
      url.searchParams.set('sort', sortBy);
      if (searchQuery) url.searchParams.set('search', searchQuery);
      if (selectedHashtag) url.searchParams.set('hashtag', selectedHashtag);

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        const loadedPosts = json.data || [];
        setPosts(loadedPosts);
        // Load comments in background
        fetchCommentsForPosts(loadedPosts);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      toast('Failed to load forum posts.', 'error');
    } finally {
      setLoading(false);
    }
  }, [sortBy, searchQuery, selectedHashtag, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Dynamic Trending Hashtags calculation (aggregated from current posts)
  const getTrendingHashtags = () => {
    const counts: Record<string, number> = {};
    posts.forEach(p => {
      p.hashtags.forEach(tag => {
        const lower = tag.toLowerCase();
        counts[lower] = (counts[lower] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };
  const trendingTags = getTrendingHashtags();
  const tagListOnly = trendingTags.map(t => t.name);

  // Handle post submit
  const handlePostSubmit = async (content: string, hashtags: string[], imageUrl?: string) => {
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, imageUrl }),
      });

      if (res.ok) {
        toast('Post published successfully!', 'success');
        await updatePoints(); // Sync new points balance (+5 pts + potential month bonus)
        await fetchPosts(); // Reload feed
      } else {
        const json = await res.json();
        toast(json.error || 'Failed to submit post.', 'error');
      }
    } catch (err) {
      console.error('Failed to submit post:', err);
      toast('Network error while publishing post.', 'error');
    }
  };

  // Toggle Like Action
  const handleLike = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}/like`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        const { liked, likeCount } = json.data;
        
        // Optimistically update post likes locally
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, likedByUser: liked, likeCount } : p))
        );

        // If it just reached 10 likes, update author points (might affect logged in user)
        if (likeCount === 10) {
          await updatePoints();
        }
      }
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  // Toggle Pinned status (admin)
  const handleTogglePin = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}/pin`, { method: 'PATCH' });
      if (res.ok) {
        toast('Post pin status updated.', 'info');
        await fetchPosts();
      }
    } catch (err) {
      console.error('Failed to pin post:', err);
    }
  };

  // Delete post (author / admin)
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        toast('Post deleted successfully.', 'success');
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  // Submit Comments
  const handleAddComment = async (postId: string, content: string, parentId: string | null) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentId }),
      });

      if (res.ok) {
        // Fetch comments again to update the thread
        const cRes = await fetch(`/api/posts/${postId}/comments`);
        if (cRes.ok) {
          const cJson = await cRes.json();
          setCommentsMap((prev) => ({
            ...prev,
            [postId]: cJson.data || [],
          }));
        }

        // Increment post comment counts in state
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p))
        );

        toast('Comment added!', 'success');
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <MessageSquare className="h-7 w-7 text-pink-500" />
          Open Forum
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Share tips, discuss workload, and interact openly with your team.
        </p>
      </div>

      {/* Main Grid: Feed + Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        
        {/* Left: Feed (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Post Creation Area */}
          <PostEditor
            onSubmit={handlePostSubmit}
            trendingHashtags={tagListOnly}
          />

          {/* Filtering / Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm">
            {/* Sort Tabs */}
            <Tabs
              tabs={sortTabs}
              activeTab={sortBy}
              onChange={setSortBy}
              className="border-none space-x-1"
            />

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search forum..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Posts Feed list */}
          {loading ? (
            <div className="flex h-[30vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 text-slate-400">
              <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold">No discussions yet</p>
              <p className="text-xs mt-1">Be the first to share an update or question on the feed!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  comments={commentsMap[post.id] || []}
                  onLike={handleLike}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                  onAddComment={handleAddComment}
                  onSelectHashtag={setSelectedHashtag}
                />
              ))}
            </div>
          )}

        </div>

        {/* Right: Widgets Sidebar (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          <HashtagSidebar
            hashtags={trendingTags}
            selectedHashtag={selectedHashtag}
            onSelectHashtag={setSelectedHashtag}
          />

          <TopLikedWidget
            posts={posts}
            onSelectPost={(id) => {
              const element = document.getElementById(id);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-primary-500/30');
                setTimeout(() => {
                  element.classList.remove('ring-2', 'ring-primary-500/30');
                }, 1500);
              }
            }}
          />
        </div>

      </div>

    </div>
  );
}
