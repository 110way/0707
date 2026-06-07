'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePoints } from '@/hooks/usePoints';
import { useToast } from '@/components/ui/Toast';
import { Survey } from '@/types';
import { SurveyCard } from '@/components/surveys/SurveyCard';
import { SurveyModal } from '@/components/surveys/SurveyModal';
import { SurveyBuilder } from '@/components/surveys/SurveyBuilder';
import { Tabs, Button } from '@/components/ui';
import { ClipboardList, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SurveysPage() {
  const { user } = useAuth();
  const { updatePoints } = usePoints();
  const { toast } = useToast();
  
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [activeSurveyForTaking, setActiveSurveyForTaking] = useState<Survey | null>(null);

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/surveys');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSurveys(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch surveys:', err);
      toast('Failed to load surveys. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  // Filter tabs definition
  const tabs = [
    { id: 'all', label: 'All Surveys' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'expired', label: 'Expired' },
  ];

  // Filtering logic
  const filteredSurveys = surveys.filter((s) => {
    const isExpired = s.status === 'expired' || new Date(s.deadline) < new Date();
    if (activeTab === 'active') return s.status === 'active' && !isExpired && !s.completedByUser;
    if (activeTab === 'completed') return s.completedByUser;
    if (activeTab === 'expired') return isExpired;
    return true;
  });

  // Handle survey submit from modal
  const handleSurveySubmit = async (answers: Record<string, any>, pointsReward: number) => {
    if (!activeSurveyForTaking) return;
    
    try {
      const res = await fetch(`/api/surveys/${activeSurveyForTaking.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (res.ok) {
        toast(`Survey submitted! Earned +${pointsReward} points.`, 'success');
        setActiveSurveyForTaking(null);
        await updatePoints(); // Sync new points balance
        await fetchSurveys(); // Refresh status list
      } else {
        const json = await res.json();
        toast(json.error || 'Failed to submit survey answers.', 'error');
      }
    } catch (err) {
      console.error('Failed to submit survey:', err);
      toast('Network error while submitting survey.', 'error');
    }
  };

  // Handle survey creation from builder
  const handleSurveySave = async (newSurveyData: Omit<Survey, 'id'>) => {
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSurveyData),
      });

      if (res.ok) {
        toast('Survey published successfully!', 'success');
        setIsBuilderOpen(false);
        await fetchSurveys();
      } else {
        const json = await res.json();
        toast(json.error || 'Failed to publish survey.', 'error');
      }
    } catch (err) {
      console.error('Failed to create survey:', err);
      toast('Network error while creating survey.', 'error');
    }
  };

  const isHrOrAdmin = user && user.role === 'admin';

  return (
    <div className="space-y-8 pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ClipboardList className="h-7 w-7 text-indigo-500" />
            Surveys & Feedback
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Participate in wellbeing loops, review ergonomical checks, and earn points.
          </p>
        </div>

        {isHrOrAdmin && !isBuilderOpen && (
          <Button
            onClick={() => setIsBuilderOpen(true)}
            className="flex items-center gap-1.5 self-start md:self-auto shadow-md shadow-primary-500/10"
          >
            <Plus className="h-4.5 w-4.5" />
            Create Survey
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isBuilderOpen ? (
          /* Survey Builder Mode */
          <motion.div
            key="builder"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <SurveyBuilder
              onSave={handleSurveySave}
              onClose={() => setIsBuilderOpen(false)}
            />
          </motion.div>
        ) : (
          /* Surveys Dashboard Mode */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Filter Tabs */}
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            {/* Surveys Cards Grid */}
            {loading ? (
              <div className="flex h-[30vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : filteredSurveys.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 text-slate-400">
                <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold">No surveys found</p>
                <p className="text-xs mt-1">There are no questionnaires matching the selected filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredSurveys.map((survey) => (
                  <SurveyCard
                    key={survey.id}
                    survey={survey}
                    onTake={(s) => setActiveSurveyForTaking(s)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Survey taking wizard modal */}
      <SurveyModal
        survey={activeSurveyForTaking}
        isOpen={activeSurveyForTaking !== null}
        onClose={() => setActiveSurveyForTaking(null)}
        onSubmit={handleSurveySubmit}
      />

    </div>
  );
}
