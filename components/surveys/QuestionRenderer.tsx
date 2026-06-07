'use client';

import React from 'react';
import { Question } from '@/types';
import { Star } from 'lucide-react';

interface QuestionRendererProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({ question, value, onChange }) => {
  
  // Render Star Rating (1 to 5)
  const renderRating = () => {
    const currentRating = typeof value === 'number' ? value : 0;
    return (
      <div className="flex items-center gap-3 py-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg p-1 transition-transform active:scale-95"
            aria-label={`Rate ${star} stars`}
          >
            <Star
              className={`h-9 w-9 transition-colors duration-200 ${
                star <= currentRating
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-300 dark:text-slate-700 hover:text-amber-300'
              }`}
            />
          </button>
        ))}
        {currentRating > 0 && (
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-2">
            ({currentRating} out of 5)
          </span>
        )}
      </div>
    );
  };

  // Render Radio options
  const renderRadio = () => {
    return (
      <div className="space-y-2.5">
        {question.options?.map((option) => {
          const isSelected = value === option;
          return (
            <label
              key={option}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option}
                checked={isSelected}
                onChange={() => onChange(option)}
                className="h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{option}</span>
            </label>
          );
        })}
      </div>
    );
  };

  // Render Checkbox options
  const renderCheckbox = () => {
    const selectedOptions = Array.isArray(value) ? value : [];
    
    const handleCheckboxChange = (option: string) => {
      if (selectedOptions.includes(option)) {
        onChange(selectedOptions.filter((item) => item !== option));
      } else {
        onChange([...selectedOptions, option]);
      }
    };

    return (
      <div className="space-y-2.5">
        {question.options?.map((option) => {
          const isChecked = selectedOptions.includes(option);
          return (
            <label
              key={option}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                isChecked
                  ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleCheckboxChange(option)}
                className="h-4 w-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{option}</span>
            </label>
          );
        })}
      </div>
    );
  };

  // Render Yes/No Buttons
  const renderYesNo = () => {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Yes', val: true, bg: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400', activeBg: 'border-emerald-500 bg-emerald-100/50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20' },
          { label: 'No', val: false, bg: 'border-rose-200 hover:border-rose-400 bg-rose-50/50 dark:bg-rose-950/10 text-rose-700 dark:text-rose-400', activeBg: 'border-rose-500 bg-rose-100/50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/20' },
        ].map((btn) => {
          const isSelected = value === btn.val;
          return (
            <button
              key={btn.label}
              type="button"
              onClick={() => onChange(btn.val)}
              className={`py-6 px-4 rounded-2xl border-2 font-bold text-lg flex items-center justify-center transition-all ${
                isSelected ? btn.activeBg : `border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 ${btn.bg}`
              }`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>
    );
  };

  // Render Single-line Text Input
  const renderShortText = () => {
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        placeholder="Type your answer here..."
        required={question.required}
      />
    );
  };

  // Render Multi-line Text Area
  const renderLongText = () => {
    const text = value || '';
    const maxChars = 500;
    return (
      <div className="space-y-1.5">
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
          placeholder="Share your detailed thoughts..."
          required={question.required}
        />
        <div className="flex justify-end text-xs text-slate-400">
          {text.length}/{maxChars} characters
        </div>
      </div>
    );
  };

  switch (question.type) {
    case 'rating':
      return renderRating();
    case 'radio':
      return renderRadio();
    case 'checkbox':
      return renderCheckbox();
    case 'yes_no':
      return renderYesNo();
    case 'short_text':
      return renderShortText();
    case 'long_text':
      return renderLongText();
    default:
      return null;
  }
};
