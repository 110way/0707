'use client';

import React, { useState } from 'react';
import { Question, QuestionType, Survey } from '@/types';
import { Button, Card, CardBody, Badge } from '@/components/ui';
import { Plus, Trash, ArrowUp, ArrowDown, Settings, Eye, FileText, Calendar, Sparkles } from 'lucide-react';

interface SurveyBuilderProps {
  onSave: (survey: Omit<Survey, 'id'>) => void;
  onClose: () => void;
}

export const SurveyBuilder: React.FC<SurveyBuilderProps> = ({ onSave, onClose }) => {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pointsReward, setPointsReward] = useState(15);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Step navigation helper
  const nextStep = () => {
    if (step === 1 && (!title || !description || !deadline)) return;
    if (step === 2 && questions.length === 0) return;
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  // Add a new question to the list
  const addQuestion = (type: QuestionType) => {
    const newQ: Question = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      text: '',
      required: true,
      options: ['radio', 'checkbox'].includes(type) ? ['Option 1', 'Option 2'] : undefined,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  // Edit question text
  const updateQuestionText = (id: string, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, text } : q))
    );
  };

  // Edit question options
  const updateQuestionOption = (qId: string, optIndex: number, val: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId && q.options) {
          const newOpts = [...q.options];
          newOpts[optIndex] = val;
          return { ...q, options: newOpts };
        }
        return q;
      })
    );
  };

  // Add an option to options list
  const addOption = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId && q.options) {
          return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] };
        }
        return q;
      })
    );
  };

  // Remove an option
  const removeOption = (qId: string, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId && q.options && q.options.length > 2) {
          return { ...q, options: q.options.filter((_, idx) => idx !== optIndex) };
        }
        return q;
      })
    );
  };

  // Toggle required state
  const toggleRequired = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, required: !q.required } : q))
    );
  };

  // Delete question
  const deleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Reordering helpers (accessible arrows)
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    
    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;
    setQuestions(newQuestions);
  };

  // Final Submit
  const handlePublish = () => {
    onSave({
      title,
      description,
      deadline,
      status: 'active',
      questionCount: questions.length,
      pointsReward,
      questions,
    });
  };

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 max-w-3xl mx-auto shadow-md">
      <CardBody className="p-6 md:p-8 space-y-6">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-500" />
              Survey Builder
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Create and publish feedback questionnaires.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* STEP 1: General Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-slate-400" />
              General Details
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Survey Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="e.g., Q3 Ergonomic comfort checkpoint"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                placeholder="Describe the purpose of this survey..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Submission Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Points Reward</label>
                <input
                  type="number"
                  value={pointsReward}
                  onChange={(e) => setPointsReward(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="5"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Questions Editor */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-slate-400" />
                Questions Setup ({questions.length})
              </h3>
            </div>

            {/* Question editor box */}
            {questions.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-slate-400">
                <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold">No questions added yet</p>
                <p className="text-xs mt-1">Select a question type below to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, index) => (
                  <div
                    key={q.id}
                    className="p-5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl space-y-4 relative"
                  >
                    {/* Question Action Row */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="info" className="capitalize text-[10px] py-0.5 px-2">
                          {q.type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-400">Question {index + 1}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveQuestion(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          aria-label="Move Up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveQuestion(index, 'down')}
                          disabled={index === questions.length - 1}
                          className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          aria-label="Move Down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteQuestion(q.id)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded text-slate-400 hover:text-rose-600"
                          aria-label="Delete Question"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question text */}
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestionText(q.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="e.g., Rate your team collaboration comfort level?"
                      />
                    </div>

                    {/* Question options if radio/checkbox */}
                    {['radio', 'checkbox'].includes(q.type) && q.options && (
                      <div className="space-y-2 pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Choices</span>
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateQuestionOption(q.id, optIdx, e.target.value)}
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                            />
                            {q.options!.length > 2 && (
                              <button
                                onClick={() => removeOption(q.id, optIdx)}
                                className="text-slate-400 hover:text-rose-500 text-xs"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(q.id)}
                          className="text-primary-600 dark:text-primary-400 text-xs font-semibold flex items-center gap-1 mt-1 hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Choice
                        </button>
                      </div>
                    )}

                    {/* Required flag toggle */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`req-${q.id}`}
                        checked={q.required}
                        onChange={() => toggleRequired(q.id)}
                        className="h-3.5 w-3.5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <label htmlFor={`req-${q.id}`} className="text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer">
                        This question is required
                      </label>
                    </div>

                  </div>
                ))}
              </div>
            )}

            {/* Selector bar to add questions */}
            <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Add Question:</span>
              {[
                { label: '⭐ Rating', type: 'rating' as const },
                { label: '🔘 Multiple Choice', type: 'radio' as const },
                { label: '☑ Checkboxes', type: 'checkbox' as const },
                { label: '📝 Long Text', type: 'long_text' as const },
                { label: '💬 Short Text', type: 'short_text' as const },
                { label: '🌗 Yes/No', type: 'yes_no' as const },
              ].map((btn) => (
                <Button
                  key={btn.type}
                  size="sm"
                  variant="secondary"
                  onClick={() => addQuestion(btn.type)}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 py-1.5 px-3 rounded-lg text-xs"
                >
                  {btn.label}
                </Button>
              ))}
            </div>

          </div>
        )}

        {/* STEP 3: Preview and Publish */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Eye className="h-4.5 w-4.5 text-slate-400" />
              Preview Questionnaire
            </h3>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-50/20 space-y-6">
              <div className="space-y-1">
                <Badge variant="primary" className="py-0.5 px-2 text-[10px] font-bold">
                  REWARD: {pointsReward} POINTS
                </Badge>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                <p className="text-xs text-slate-400 italic">Deadline: {deadline}</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                {questions.map((q, index) => (
                  <div key={q.id} className="space-y-2">
                    <span className="text-xs font-bold text-slate-400">Question {index + 1} {q.required && '*'}</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{q.text}</p>
                    <div className="text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                      [{q.type.toUpperCase()} INPUT FIELD PLACEHOLDER]
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Actions Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-6">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : prevStep}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          <Button
            variant="primary"
            onClick={step === 3 ? handlePublish : nextStep}
            disabled={
              (step === 1 && (!title || !description || !deadline)) ||
              (step === 2 && questions.length === 0)
            }
          >
            {step === 3 ? 'Publish' : 'Continue'}
          </Button>
        </div>

      </CardBody>
    </Card>
  );
};
