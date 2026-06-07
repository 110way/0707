'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Survey } from '@/types';
import { Button, Badge } from '@/components/ui';
import { QuestionRenderer } from './QuestionRenderer';
import { ArrowLeft, ArrowRight, Award, CheckCircle, X } from 'lucide-react';

interface SurveyModalProps {
  survey: Survey | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (answers: Record<string, any>, pointsReward: number) => void;
}

export const SurveyModal: React.FC<SurveyModalProps> = ({ survey, isOpen, onClose, onSubmit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  if (!survey || !survey.questions) return null;

  const currentQuestion = survey.questions[currentIndex];
  const totalQuestions = survey.questions.length;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const handleAnswerChange = (value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  // Perform simple validation for required question
  const isQuestionValid = () => {
    if (!currentQuestion.required) return true;
    const answer = answers[currentQuestion.id];
    if (answer === undefined || answer === null || answer === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  };

  const handleNext = () => {
    if (!isQuestionValid()) return;
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsSuccess(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    // Reset local states
    setCurrentIndex(0);
    setAnswers({});
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(answers, survey.pointsReward);
    handleClose();
  };

  const slideVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col h-full"
        >
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Badge variant="primary" className="py-1 px-2 text-xs font-bold">
                SURVEY WIZARD
              </Badge>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 max-w-md truncate">
                {survey.title}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              aria-label="Exit survey"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {!isSuccess ? (
            /* Question Interface */
            <div className="flex-1 flex flex-col justify-between max-w-2xl w-full mx-auto px-6 py-8">
              
              {/* Question progress and question text */}
              <div className="space-y-8">
                {/* Progress bar info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <span>Question {currentIndex + 1} of {totalQuestions}</span>
                    <span>{progressPercent}% Complete</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="bg-primary-600 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Animated Question Body */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    variants={slideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    className="space-y-6 focus:outline-none"
                  >
                    <div className="space-y-2">
                      <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
                        {currentQuestion.text}
                        {currentQuestion.required && <span className="text-rose-500 ml-1">*</span>}
                      </h3>
                      {currentQuestion.required && (
                        <p className="text-xs text-rose-500 font-medium">This question requires an answer.</p>
                      )}
                    </div>

                    <div className="pt-2">
                      <QuestionRenderer
                        question={currentQuestion}
                        value={answers[currentQuestion.id]}
                        onChange={handleAnswerChange}
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation controls */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800/60 mt-12">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={!isQuestionValid()}
                  className="flex items-center gap-1.5 min-w-[100px]"
                >
                  {currentIndex === totalQuestions - 1 ? 'Finish' : 'Next'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

            </div>
          ) : (
            /* Success Screen */
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto px-6 text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 scale-125 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 animate-pulse" />
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  <CheckCircle className="h-10 w-10" />
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Survey Completed!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Thank you for sharing your feedback. Your anonymous response helps us make the workplace better for everyone.
                </p>
              </div>

              <Badge variant="warning" className="text-base font-bold py-2.5 px-5 rounded-2xl flex items-center gap-2 border border-amber-200/20 shadow-md shadow-amber-500/5">
                <Award className="h-5 w-5 text-amber-500" />
                <span>Earned +{survey.pointsReward} Konnect Points!</span>
              </Badge>

              <div className="flex gap-4 pt-4 w-full">
                <Button variant="outline" fullWidth onClick={handleClose}>
                  Close
                </Button>
                <Button variant="primary" fullWidth onClick={handleSubmit}>
                  Claim Points
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
