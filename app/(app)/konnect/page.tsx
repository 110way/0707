'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePoints } from '@/hooks/usePoints';
import { useToast } from '@/components/ui/Toast';
import { PointsLogEntry, RedemptionOption } from '@/types';
import { PointsBalanceCard } from '@/components/konnect/PointsBalanceCard';
import { RedemptionCard } from '@/components/konnect/RedemptionCard';
import { PointsHistory } from '@/components/konnect/PointsHistory';
import { Modal, Button } from '@/components/ui';
import { Coins, Gift, Loader2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

const REDEMPTION_OPTIONS: RedemptionOption[] = [
  { id: 'team_lead',    label: '1:1 with Team Lead',       description: '30-minute informal check-in regarding career focus, feedback, or guidance.', cost: 70,  durationMinutes: 30 },
  { id: 'manager',      label: 'Career Chat with Manager', description: '45-minute focused discussion mapping out career goals, milestones, and blockers.', cost: 100, durationMinutes: 45 },
  { id: 'mentorship',   label: 'Mentorship Session',       description: '1-hour technical or professional guidance session with a senior lead of choice.', cost: 200, durationMinutes: 60 },
  { id: 'cxo',          label: 'Meet with CXO',            description: '30-minute exclusive meeting with a member of executive leadership.', cost: 250, durationMinutes: 30 },
];

export default function KonnectPage() {
  const { user } = useAuth();
  const { updatePoints } = usePoints();
  const { toast } = useToast();

  const [pointsBalance, setPointsBalance] = useState(user?.pointsBalance || 0);
  const [streak, setStreak] = useState(0);
  const [logs, setLogs] = useState<PointsLogEntry[]>([]);
  const [selectedOption, setSelectedOption] = useState<RedemptionOption | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [balRes, histRes] = await Promise.all([
        fetch('/api/konnect/balance'),
        fetch('/api/konnect/history'),
      ]);

      if (balRes.ok) {
        const balJson = await balRes.json();
        setPointsBalance(balJson.data.balance);
        setStreak(balJson.data.streak);
      }
      
      if (histRes.ok) {
        const histJson = await histRes.json();
        setLogs(histJson.data || []);
      }
    } catch (err) {
      console.error('Failed to load points / history:', err);
      toast('Failed to load rewards balance.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute cooldown status (30 days limit) for a specific option
  const getCooldownStatus = (optionLabel: string) => {
    const latestRedeem = logs.find(
      (l) => l.activity === `Redeemed: ${optionLabel}` && l.delta < 0
    );
    if (!latestRedeem) return { isCooldown: false, daysLeft: 0 };
    
    try {
      const lastDate = parseISO(latestRedeem.createdAt);
      const diff = differenceInDays(new Date(), lastDate);
      const remaining = 30 - diff;
      return {
        isCooldown: remaining > 0,
        daysLeft: Math.max(0, remaining),
      };
    } catch (e) {
      return { isCooldown: false, daysLeft: 0 };
    }
  };

  const handleOpenConfirm = (option: RedemptionOption) => {
    setSelectedOption(option);
  };

  const handleCloseConfirm = () => {
    setSelectedOption(null);
  };

  // Perform point redemption
  const handleRedeemConfirm = async () => {
    if (!selectedOption || !user) return;

    try {
      const res = await fetch('/api/konnect/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId: selectedOption.id }),
      });

      if (res.ok) {
        toast(`Successfully redeemed voucher for: ${selectedOption.label}!`, 'success');
        setSelectedOption(null);
        await updatePoints(); // Sync usePoints hook points
        await fetchData(); // Reload balance and history logs
      } else {
        const json = await res.json();
        toast(json.error || 'Redemption failed.', 'error');
      }
    } catch (err) {
      console.error('Failed to redeem:', err);
      toast('Network error during points redemption.', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Coins className="h-7 w-7 text-emerald-500" />
          Konnect Rewards
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Redeem your accumulated wellbeing checkpoints points for valuable coaching & development opportunities.
        </p>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          {/* 1. Points Balance Card (Streaks & progress) */}
          <PointsBalanceCard
            balance={pointsBalance}
            streak={streak}
          />

          {/* 2. Redemption Cards Grid (2x2) */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider block">
              Available Redemptions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {REDEMPTION_OPTIONS.map((option) => {
                const cooldown = getCooldownStatus(option.label);
                return (
                  <RedemptionCard
                    key={option.id}
                    option={option}
                    userPoints={pointsBalance}
                    onRedeem={handleOpenConfirm}
                    isCooldown={cooldown.isCooldown}
                    cooldownDaysRemaining={cooldown.daysLeft}
                  />
                );
              })}
            </div>
          </div>

          {/* 3. Points History timeline */}
          <PointsHistory logs={logs} />
        </>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={selectedOption !== null}
        onClose={handleCloseConfirm}
        title="Confirm Point Redemption"
        size="sm"
      >
        {selectedOption && (
          <div className="space-y-5 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mx-auto">
              <Gift className="h-6 w-6" />
            </span>
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                Redeem {selectedOption.label}?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                This will deduct <span className="font-bold text-slate-700 dark:text-slate-200">{selectedOption.cost} points</span> from your balance. An invitation voucher will be generated for you.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" fullWidth onClick={handleCloseConfirm}>
                Cancel
              </Button>
              <Button variant="primary" fullWidth onClick={handleRedeemConfirm}>
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
