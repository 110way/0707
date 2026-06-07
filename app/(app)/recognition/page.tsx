'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Recognition, WallOfFameEntry, BadgeType, AuthUser } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { usePoints } from '@/hooks/usePoints';
import { useToast } from '@/components/ui/Toast';
import { WallOfFame } from '@/components/recognition/WallOfFame';
import { GiveRecognitionModal } from '@/components/recognition/GiveRecognitionModal';
import { RecognitionCard } from '@/components/recognition/RecognitionCard';
import { Card, CardHeader, CardBody, CardTitle, Avatar, Badge, Button } from '@/components/ui';
import { Award, Plus, Trophy, Loader2 } from 'lucide-react';

export default function RecognitionPage() {
  const { user } = useAuth();
  const { updatePoints } = usePoints();
  const { toast } = useToast();

  const [feed, setFeed] = useState<Recognition[]>([]);
  const [wallOfFame, setWallOfFame] = useState<WallOfFameEntry[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [feedRes, wofRes, recRes] = await Promise.all([
        fetch('/api/recognitions'),
        fetch('/api/recognitions/wall-of-fame'),
        fetch('/api/users'),
      ]);

      if (feedRes.ok) {
        const json = await feedRes.json();
        setFeed(json.data || []);
      }
      if (wofRes.ok) {
        const json = await wofRes.json();
        setWallOfFame(json.data || []);
      }
      if (recRes.ok) {
        const json = await recRes.json();
        setRecipients(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load recognition data:', err);
      toast('Failed to load kudos feed or wall of fame.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle kudos likes
  const handleLike = async (id: string) => {
    try {
      const res = await fetch(`/api/recognitions/${id}/like`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        const { liked, likeCount } = json.data;
        
        setFeed((prev) =>
          prev.map((rec) => {
            if (rec.id === id) {
              return {
                ...rec,
                likedByUser: liked,
                likeCount,
              };
            }
            return rec;
          })
        );
      }
    } catch (err) {
      console.error('Failed to like kudos:', err);
    }
  };

  // Submit comments
  const handleAddComment = async (recId: string, content: string) => {
    try {
      const res = await fetch(`/api/recognitions/${recId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const json = await res.json();
        const newComment = json.data;

        setFeed((prev) =>
          prev.map((rec) => {
            if (rec.id === recId) {
              return {
                ...rec,
                comments: [...rec.comments, newComment],
              };
            }
            return rec;
          })
        );
        toast('Comment added!', 'success');
      }
    } catch (err) {
      console.error('Failed to add comments to kudos:', err);
    }
  };

  // Submit a new peer recognition
  const handleGiveRecognition = async (data: {
    recipientId: string;
    badge: BadgeType;
    message: string;
    attachmentUrl?: string;
  }) => {
    try {
      const res = await fetch('/api/recognitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const json = await res.json();
        const newKudos = json.data;

        toast(`Appreciation sent! You earned +5 points. Recipient earned +10 points.`, 'success');
        setIsGiveModalOpen(false);

        // Sync points, reload feed and wall of fame
        await updatePoints();
        const [feedRes, wofRes] = await Promise.all([
          fetch('/api/recognitions'),
          fetch('/api/recognitions/wall-of-fame'),
        ]);

        if (feedRes.ok) {
          const fJson = await feedRes.json();
          setFeed(fJson.data || []);
        }
        if (wofRes.ok) {
          const wJson = await wofRes.json();
          setWallOfFame(wJson.data || []);
        }
      } else {
        const json = await res.json();
        toast(json.error || 'Failed to send appreciation.', 'error');
      }
    } catch (err) {
      console.error('Failed to submit recognition:', err);
      toast('Network error sending appreciation.', 'error');
    }
  };

  // Get Top Leaderboard
  const leaderboard = [...wallOfFame]
    .sort((a, b) => b.recognitionCount - a.recognitionCount)
    .slice(0, 5);

  const BADGES: Record<BadgeType, string> = {
    Excellence: '🏆',
    Innovation: '💡',
    Teamwork: '🤝',
    Leadership: '⭐',
    AboveAndBeyond: '💪',
    ProblemSolver: '🎯',
  };

  return (
    <div className="space-y-10 pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Award className="h-7 w-7 text-amber-500" />
            Peer Recognition
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Celebrate colleagues, send appreciation badges, and view team milestones.
          </p>
        </div>

        <Button
          onClick={() => setIsGiveModalOpen(true)}
          className="flex items-center gap-1.5 self-start md:self-auto shadow-md shadow-primary-500/10"
        >
          <Plus className="h-4.5 w-4.5" />
          Give Recognition
        </Button>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          {/* 1. Wall of Fame Auto Carousel */}
          {wallOfFame.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center">
                Wall of Fame spotlight
              </h2>
              <WallOfFame entries={wallOfFame} />
            </div>
          )}

          {/* 2. Main content area: Feed + Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
            
            {/* Left: Feed list (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-col space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recognition Feed</h3>
                <p className="text-xs text-slate-400">Read what people are saying about their teammates.</p>
              </div>

              {feed.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 text-slate-400">
                  <Award className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold">No recognition logs yet</p>
                  <p className="text-xs mt-1">Be the first to appreciate a teammate!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {feed.map((kudos) => (
                    <RecognitionCard
                      key={kudos.id}
                      recognition={kudos}
                      onLike={handleLike}
                      onAddComment={handleAddComment}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Leaderboard sidebar (3 Cols) */}
            <div className="lg:col-span-3">
              <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm sticky top-24">
                <CardHeader className="flex flex-row items-center gap-2">
                  <Trophy className="h-4.5 w-4.5 text-amber-500" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Top Appreciated
                  </CardTitle>
                </CardHeader>
                <CardBody className="p-4 space-y-4">
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No leaders yet.
                    </div>
                  ) : (
                    leaderboard.map((item, idx) => (
                      <div key={item.employee.id} className="flex items-center justify-between gap-3 p-1 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-400 min-w-[12px]">{idx + 1}</span>
                          <Avatar name={item.employee.name} src={item.employee.avatarUrl} size="sm" />
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-none">
                              {item.employee.name}
                            </span>
                            <span className="text-[10px] text-slate-400">{item.employee.department}</span>
                          </div>
                        </div>

                        <Badge variant="default" className="text-[10px] flex items-center gap-1 font-bold py-0.5 px-2">
                          <span>{BADGES[item.topBadge]}</span>
                          <span>{item.recognitionCount} kudos</span>
                        </Badge>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>
            </div>

          </div>
        </>
      )}

      {/* Give Recognition Modal */}
      <GiveRecognitionModal
        isOpen={isGiveModalOpen}
        onClose={() => setIsGiveModalOpen(false)}
        users={recipients}
        onSubmit={handleGiveRecognition}
      />

    </div>
  );
}
