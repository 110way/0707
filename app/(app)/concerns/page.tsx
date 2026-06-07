'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { Concern, ConcernCategory, ConcernSeverity } from '@/types';
import { ConcernForm } from '@/components/concerns/ConcernForm';
import { ReferenceDisplay } from '@/components/concerns/ReferenceDisplay';
import { StatusTracker } from '@/components/concerns/StatusTracker';
import { AdminConcernTable } from '@/components/concerns/AdminConcernTable';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function ConcernsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  const isHrOrAdmin = user && user.role === 'admin';

  const fetchAdminConcerns = useCallback(async () => {
    if (!isHrOrAdmin) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/concerns');
      if (res.ok) {
        const json = await res.json();
        setConcerns(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin concerns:', err);
      toast('Failed to load concern tickets.', 'error');
    } finally {
      setLoading(false);
    }
  }, [isHrOrAdmin, toast]);

  useEffect(() => {
    fetchAdminConcerns();
  }, [fetchAdminConcerns]);

  // Search logic for employee status check (via anonymous status tracker API)
  const handleSearchConcern = async (refId: string): Promise<Concern | undefined> => {
    try {
      const res = await fetch(`/api/concerns/${refId}/status`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          // Wrap status details in a partial Concern object
          return {
            id: refId,
            referenceId: refId,
            status: json.data.status,
            createdAt: json.data.createdAt,
            updatedAt: json.data.updatedAt,
            category: 'Other',
            severity: 'Low',
            title: 'Anonymized Tracking Ticket',
            description: 'Anonymized Tracking Ticket',
          } as Concern;
        }
      }
      return undefined;
    } catch (err) {
      console.error('Error tracking concern status:', err);
      return undefined;
    }
  };

  // Submit concern anonymously (Employee view)
  const handleConcernSubmit = async (data: {
    referenceId: string;
    category: ConcernCategory;
    severity: ConcernSeverity;
    title: string;
    description: string;
    incidentDate?: string;
    attachmentUrl?: string;
  }) => {
    try {
      const res = await fetch('/api/concerns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setSubmittedCode(data.referenceId);
        toast('Concern submitted anonymously!', 'success');
      } else {
        const json = await res.json();
        toast(json.error || 'Failed to submit concern anonymously.', 'error');
      }
    } catch (err) {
      console.error('Failed to submit concern:', err);
      toast('Network error while submitting concern.', 'error');
    }
  };

  // Update concern status/notes/assignee (Admin view)
  const handleUpdateConcern = async (id: string, updates: Partial<Concern>) => {
    try {
      const res = await fetch(`/api/admin/concerns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        toast('Ticket details updated successfully.', 'success');
        await fetchAdminConcerns();
      } else {
        const json = await res.json();
        toast(json.error || 'Failed to update ticket details.', 'error');
      }
    } catch (err) {
      console.error('Failed to update concern ticket:', err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <ShieldAlert className="h-7 w-7 text-rose-500" />
          {isHrOrAdmin ? 'Concern Management Console' : 'Anonymous Reporting'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isHrOrAdmin 
            ? 'Review, investigate, assign, and update anonymous employee feedback logs safely.' 
            : 'Voice your concerns about workloads, harassment, or policies with zero tracking.'}
        </p>
      </div>

      {isHrOrAdmin ? (
        /* ADMIN VIEW: Management Console */
        loading ? (
          <div className="flex h-[30vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        ) : (
          <AdminConcernTable
            concerns={concerns}
            onUpdateConcern={handleUpdateConcern}
          />
        )
      ) : (
        /* EMPLOYEE VIEW: Submission & Tracking */
        <div className="space-y-6">
          {submittedCode ? (
            /* Reference Display on successful submission */
            <ReferenceDisplay
              referenceId={submittedCode}
              onReset={() => setSubmittedCode(null)}
            />
          ) : (
            /* Normal report & check layouts */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <ConcernForm onSubmit={handleConcernSubmit} />
              <StatusTracker onSearch={handleSearchConcern} />
            </div>
          )}
        </div>
      )}

    </div>
  );
}
