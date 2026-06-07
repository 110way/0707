'use client';

import React, { useState } from 'react';
import { BadgeType, AuthUser } from '@/types';
import { Button, Badge, Avatar } from '@/components/ui';
import { Search, Award, MessageSquare, Send, X, Users, Paperclip } from 'lucide-react';
import { motion } from 'framer-motion';

interface GiveRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AuthUser[];
  onSubmit: (data: {
    recipientId: string;
    badge: BadgeType;
    message: string;
    attachmentUrl?: string;
  }) => void;
}

export const GiveRecognitionModal: React.FC<GiveRecognitionModalProps> = ({
  isOpen,
  onClose,
  users,
  onSubmit,
}) => {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<AuthUser | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeType | null>(null);
  const [message, setMessage] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const BADGES = [
    { value: 'Excellence' as BadgeType, emoji: '🏆', color: 'border-amber-200 bg-amber-50/20 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40', activeColor: 'ring-2 ring-amber-500 border-amber-500', label: 'Excellence' },
    { value: 'Innovation' as BadgeType, emoji: '💡', color: 'border-blue-200 bg-blue-50/20 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40', activeColor: 'ring-2 ring-blue-500 border-blue-500', label: 'Innovation' },
    { value: 'Teamwork' as BadgeType, emoji: '🤝', color: 'border-teal-200 bg-teal-50/20 text-teal-800 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/40', activeColor: 'ring-2 ring-teal-500 border-teal-500', label: 'Teamwork' },
    { value: 'Leadership' as BadgeType, emoji: '⭐', color: 'border-purple-200 bg-purple-50/20 text-purple-800 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/40', activeColor: 'ring-2 ring-purple-500 border-purple-500', label: 'Leadership' },
    { value: 'AboveAndBeyond' as BadgeType, emoji: '💪', color: 'border-orange-200 bg-orange-50/20 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/40', activeColor: 'ring-2 ring-orange-500 border-orange-500', label: 'Above & Beyond' },
    { value: 'ProblemSolver' as BadgeType, emoji: '🎯', color: 'border-emerald-200 bg-emerald-50/20 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40', activeColor: 'ring-2 ring-emerald-500 border-emerald-500', label: 'Problem Solver' },
  ];

  const filteredUsers = searchQuery
    ? users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.department.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleNext = () => {
    if (step === 1 && !selectedRecipient) return;
    if (step === 2 && !selectedBadge) return;
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = () => {
    if (!selectedRecipient || !selectedBadge || !message.trim()) return;
    
    onSubmit({
      recipientId: selectedRecipient.id,
      badge: selectedBadge,
      message,
      attachmentUrl: attachmentName ? `/uploads/${attachmentName}` : undefined,
    });
    
    // Reset form states
    setStep(1);
    setSelectedRecipient(null);
    setSelectedBadge(null);
    setMessage('');
    setSearchQuery('');
    setAttachmentName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card content wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-xl flex flex-col justify-between overflow-hidden"
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 text-white">
              <Award className="h-4 w-4" />
            </span>
            <h3 className="font-bold text-slate-950 dark:text-white text-sm">
              Appreciate a Colleague
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* STEP BODY */}
        <div className="p-6 min-h-[300px] max-h-[420px] overflow-y-auto">
          
          {/* STEP 1: Search Recipient */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Search className="h-3.5 w-3.5" /> Step 1: Find Colleague
                </span>
                <p className="text-[11px] text-slate-400">Type the name or department of the colleague you want to appreciate.</p>
              </div>

              {selectedRecipient ? (
                /* Selected box */
                <div className="flex items-center justify-between bg-primary-50/35 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedRecipient.name} size="md" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{selectedRecipient.name}</h4>
                      <p className="text-xs text-slate-400">{selectedRecipient.department}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRecipient(null);
                      setSearchQuery('');
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    Change
                  </button>
                </div>
              ) : (
                /* Typeahead input bar */
                <div className="space-y-3 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or department..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />

                  {filteredUsers.length > 0 && (
                    <div className="border border-slate-200/60 dark:border-slate-800/60 rounded-xl bg-white dark:bg-slate-900 shadow-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/40">
                      {filteredUsers.map((usr) => (
                        <button
                          key={usr.id}
                          type="button"
                          onClick={() => {
                            setSelectedRecipient(usr);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-colors"
                        >
                          <Avatar name={usr.name} size="sm" />
                          <div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{usr.name}</span>
                            <span className="text-[10px] text-slate-400">{usr.department}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Choose Badge */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Step 2: Choose Badge
                </span>
                <p className="text-[11px] text-slate-400">Select an appreciation category that reflects their contribution.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {BADGES.map((b) => {
                  const isSelected = selectedBadge === b.value;
                  return (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => setSelectedBadge(b.value)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border border-2 text-center transition-all ${
                        isSelected ? b.activeColor : `bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 ${b.color}`
                      }`}
                    >
                      <span className="text-3xl mb-1.5">{b.emoji}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{b.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Write Message */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> Step 3: Write Appreciation
                </span>
                <p className="text-[11px] text-slate-400">Say thank you or describe their contribution. Keep it constructive!</p>
              </div>

              {/* Message field */}
              <div className="space-y-1.5">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Tell them what they did that was awesome..."
                  required
                />
                <span className="text-[10px] text-slate-400 block text-right">
                  {message.length} chars (minimum 10)
                </span>
              </div>

              {/* Optional simulated file upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">
                  Attach Kudos Image or Certificate (Optional)
                </label>
                <label className="flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer text-[11px] transition-colors">
                  <span className="text-slate-400 truncate max-w-[200px]">
                    {attachmentName || 'Select image...'}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setAttachmentName(e.target.files[0].name);
                      }
                    }}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  <Paperclip className="h-4 w-4 text-slate-400" />
                </label>
              </div>

            </div>
          )}

        </div>

        {/* STEP FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 flex justify-between gap-3">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : handlePrev}
            className="py-2 rounded-xl text-xs font-bold"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          <Button
            variant="primary"
            disabled={
              (step === 1 && !selectedRecipient) ||
              (step === 2 && !selectedBadge) ||
              (step === 3 && (message.length < 10 || !selectedRecipient || !selectedBadge))
            }
            onClick={step === 3 ? handleSubmit : handleNext}
            className="py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 min-w-[90px]"
          >
            {step === 3 ? (
              <>
                <Send className="h-3.5 w-3.5" />
                Appreciate
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>

      </motion.div>
    </div>
  );
};
