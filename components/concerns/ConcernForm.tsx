'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ConcernCategory, ConcernSeverity } from '@/types';
import { Button, Card, CardBody } from '@/components/ui';
import { AlertCircle, Calendar, FileText, Paperclip } from 'lucide-react';

interface ConcernFormProps {
  onSubmit: (data: {
    referenceId: string;
    category: ConcernCategory;
    severity: ConcernSeverity;
    title: string;
    description: string;
    incidentDate?: string;
    attachmentUrl?: string;
  }) => void;
}

export const ConcernForm: React.FC<ConcernFormProps> = ({ onSubmit }) => {
  const [referenceId, setReferenceId] = useState('');
  const [category, setCategory] = useState<ConcernCategory>('Workload');
  const [severity, setSeverity] = useState<ConcernSeverity>('Low');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Generate UUID client-side on mount
  useEffect(() => {
    setReferenceId(uuidv4());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    onSubmit({
      referenceId,
      category,
      severity,
      title,
      description,
      incidentDate: incidentDate || undefined,
      attachmentUrl: attachmentName ? `/uploads/${attachmentName}` : undefined,
    });
  };

  const handleSimulatedAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachmentName(e.target.files[0].name);
    }
  };

  const severities: { value: ConcernSeverity; color: string; activeColor: string }[] = [
    { value: 'Low', color: 'border-slate-200 dark:border-slate-800 text-slate-600', activeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-800 border-slate-500' },
    { value: 'Medium', color: 'border-amber-200 text-amber-600 dark:border-amber-900/30', activeColor: 'bg-amber-50 dark:bg-amber-950/20 border-amber-500 text-amber-800 dark:text-amber-400' },
    { value: 'High', color: 'border-orange-200 text-orange-600 dark:border-orange-900/30', activeColor: 'bg-orange-50 dark:bg-orange-950/20 border-orange-500 text-orange-800 dark:text-orange-400' },
    { value: 'Critical', color: 'border-rose-200 text-rose-600 dark:border-rose-900/30', activeColor: 'bg-rose-50 dark:bg-rose-950/20 border-rose-500 text-rose-800 dark:text-rose-400' },
  ];

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
      <CardBody className="p-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-500" />
            Submit a Concern
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Report workplace friction anonymously. No server logs or identifiers are linked.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ConcernCategory)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
            >
              {['Harassment', 'Workload', 'Management', 'Environment', 'Policy', 'Other'].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Radio row */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Severity Level</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {severities.map((sev) => {
                const isSelected = severity === sev.value;
                return (
                  <button
                    key={sev.value}
                    type="button"
                    onClick={() => setSeverity(sev.value)}
                    className={`py-2 px-3 border-2 rounded-xl text-xs font-bold transition-all text-center ${
                      isSelected ? sev.activeColor : `bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${sev.color}`
                    }`}
                  >
                    {sev.value}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Title / Summary</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Temperature levels on floor 2"
              required
            />
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Detailed Description</span>
              <span className={description.length > 950 ? 'text-rose-500' : ''}>
                {description.length}/1000
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={5}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Provide context, team details, or relevant metrics..."
              required
            />
          </div>

          {/* Optional fields: Incident Date & Attachment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Incident Date (Optional)
              </label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" /> Attachment (Optional)
              </label>
              <label className="flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer text-xs transition-colors">
                <span className="text-slate-400 truncate max-w-[120px]">
                  {attachmentName || 'Choose file...'}
                </span>
                <input
                  type="file"
                  onChange={handleSimulatedAttachment}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <span className="text-[10px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-950/20 py-1 px-2 rounded-lg shrink-0">
                  Browse
                </span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" variant="primary" fullWidth className="py-2.5 rounded-xl text-sm font-bold">
            Submit Anonymously
          </Button>
        </form>
      </CardBody>
    </Card>
  );
};
