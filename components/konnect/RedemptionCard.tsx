'use client';

import React from 'react';
import { RedemptionOption } from '@/types';
import { Card, CardBody, Badge, Button } from '@/components/ui';
import { Clock, HelpCircle, Gift } from 'lucide-react';

interface RedemptionCardProps {
  option: RedemptionOption;
  userPoints: number;
  onRedeem: (option: RedemptionOption) => void;
  isCooldown: boolean;
  cooldownDaysRemaining?: number;
}

export const RedemptionCard: React.FC<RedemptionCardProps> = ({
  option,
  userPoints,
  onRedeem,
  isCooldown,
  cooldownDaysRemaining = 30,
}) => {
  const canAfford = userPoints >= option.cost;
  const isDisabled = !canAfford || isCooldown;

  // Set color styling based on option cost tiers
  const getTierColor = (cost: number) => {
    if (cost >= 200) return 'from-purple-500 to-indigo-600';
    if (cost >= 100) return 'from-blue-500 to-indigo-500';
    return 'from-teal-500 to-emerald-500';
  };

  return (
    <Card hoverEffect className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
      <CardBody className="p-6 flex flex-col justify-between h-full space-y-6">
        
        <div className="space-y-3">
          {/* Header option icons */}
          <div className="flex items-center justify-between">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${getTierColor(option.cost)} text-white`}>
              <Gift className="h-5 w-5" />
            </span>
            <Badge variant="warning" className="font-bold text-xs py-1 px-2.5 rounded-lg border border-amber-200/25">
              {option.cost} pts
            </Badge>
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
              {option.label}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              {option.description}
            </p>
          </div>
        </div>

        {/* Bottom Details & Button trigger */}
        <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {option.durationMinutes} mins
            </span>
            {isCooldown && (
              <span className="text-rose-500 font-bold">
                Cooldown: {cooldownDaysRemaining}d left
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Button
              variant={isCooldown ? 'outline' : canAfford ? 'primary' : 'secondary'}
              disabled={isDisabled}
              fullWidth
              onClick={() => onRedeem(option)}
              className="text-xs py-2 rounded-xl"
            >
              {isCooldown ? 'Cooldown Active' : canAfford ? 'Redeem Voucher' : 'Insufficient Points'}
            </Button>
            
            {!canAfford && !isCooldown && (
              <p className="text-[10px] text-rose-500 font-medium text-center">
                Requires {option.cost - userPoints} more points to redeem.
              </p>
            )}
          </div>
        </div>

      </CardBody>
    </Card>
  );
};
