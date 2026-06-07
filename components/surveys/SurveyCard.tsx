'use client';

import React from 'react';
import { Survey } from '@/types';
import { Card, CardBody, Badge, Button } from '@/components/ui';
import { differenceInDays, formatDistanceToNow, isAfter, parseISO } from 'date-fns';
import { Calendar, HelpCircle, CheckCircle2, Award } from 'lucide-react';

interface SurveyCardProps {
  survey: Survey;
  onTake: (survey: Survey) => void;
}

export const SurveyCard: React.FC<SurveyCardProps> = ({ survey, onTake }) => {
  const isExpired = survey.status === 'expired' || new Date(survey.deadline) < new Date();
  const isCompleted = survey.completedByUser;
  
  // Format deadline string
  const getDeadlineText = () => {
    try {
      const deadlineDate = parseISO(survey.deadline);
      if (isAfter(deadlineDate, new Date())) {
        return `Closes in ${formatDistanceToNow(deadlineDate)}`;
      }
      return `Closed ${formatDistanceToNow(deadlineDate)} ago`;
    } catch (e) {
      return 'Deadline passed';
    }
  };

  const statusBadge = () => {
    if (isCompleted) return <Badge variant="success">Completed</Badge>;
    if (isExpired) return <Badge variant="danger">Expired</Badge>;
    return <Badge variant="primary">Active</Badge>;
  };

  return (
    <Card hoverEffect className="relative border-slate-200/60 dark:border-slate-800/60">
      {/* Completed Checkmark Overlay watermark */}
      {isCompleted && (
        <div className="absolute top-4 right-4 text-emerald-500 pointer-events-none">
          <CheckCircle2 className="h-6 w-6 fill-emerald-50 dark:fill-transparent" />
        </div>
      )}

      <CardBody className="p-6 flex flex-col justify-between h-full space-y-6">
        <div className="space-y-3">
          {/* Top Status & Rewards Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {statusBadge()}
              <Badge variant="info" className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                {survey.questionCount} {survey.questionCount === 1 ? 'question' : 'questions'}
              </Badge>
            </div>
            
            <Badge variant="warning" className="flex items-center gap-1.5 font-bold py-1 px-2.5 rounded-lg">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              <span>+{survey.pointsReward} pts</span>
            </Badge>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-snug line-clamp-1">
              {survey.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {survey.description}
            </p>
          </div>
        </div>

        {/* Bottom details & Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/50">
          <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            {getDeadlineText()}
          </span>

          <Button
            size="sm"
            variant={isCompleted ? 'outline' : isExpired ? 'ghost' : 'primary'}
            disabled={isCompleted || isExpired}
            onClick={() => onTake(survey)}
          >
            {isCompleted ? 'Submitted' : isExpired ? 'Expired' : 'Take Survey'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};
