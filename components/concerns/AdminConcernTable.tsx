'use client';

import React, { useState } from 'react';
import { Concern, ConcernStatus, ConcernCategory, ConcernSeverity } from '@/types';
import { Badge, Button, Card, CardBody } from '@/components/ui';
import { differenceInDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  User, 
  Calendar, 
  X, 
  FileText, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  Clipboard 
} from 'lucide-react';

interface AdminConcernTableProps {
  concerns: Concern[];
  onUpdateConcern: (id: string, updates: Partial<Concern>) => void;
}

export const AdminConcernTable: React.FC<AdminConcernTableProps> = ({
  concerns,
  onUpdateConcern,
}) => {
  const [selectedConcern, setSelectedConcern] = useState<Concern | null>(null);
  
  // Filtering States
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Drawer Edit states
  const [adminNotes, setAdminNotes] = useState('');
  const [status, setStatus] = useState<ConcernStatus>('Open');
  const [assigneeId, setAssigneeId] = useState('');

  // Dropdown list values
  const categories: ConcernCategory[] = ['Harassment', 'Workload', 'Management', 'Environment', 'Policy', 'Other'];
  const severities: ConcernSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
  const statuses: ConcernStatus[] = ['Open', 'In Progress', 'Resolved', 'Unaddressed'];

  // Handle row clicks
  const openDrawer = (concern: Concern) => {
    setSelectedConcern(concern);
    setAdminNotes(concern.adminNotes || '');
    setStatus(concern.status);
    setAssigneeId(concern.assigneeId || '');
  };

  const closeDrawer = () => {
    setSelectedConcern(null);
  };

  const handleSaveDetails = () => {
    if (!selectedConcern) return;
    onUpdateConcern(selectedConcern.id, {
      status,
      adminNotes,
      assigneeId: assigneeId || undefined,
    });
    // Update local drawer state too
    setSelectedConcern(prev => prev ? { ...prev, status, adminNotes, assigneeId } : null);
    closeDrawer();
  };

  // Filter computation
  const filteredConcerns = concerns.filter((c) => {
    const statusMatch = statusFilter === 'All' ? true : c.status === statusFilter;
    const severityMatch = severityFilter === 'All' ? true : c.severity === severityFilter;
    const categoryMatch = categoryFilter === 'All' ? true : c.category === categoryFilter;
    return statusMatch && severityMatch && categoryMatch;
  });

  const getStatusBadge = (s: ConcernStatus) => {
    switch (s) {
      case 'Open': return <Badge variant="danger">Open</Badge>;
      case 'In Progress': return <Badge variant="warning">In Progress</Badge>;
      case 'Resolved': return <Badge variant="success">Resolved</Badge>;
      default: return <Badge variant="default">Unaddressed</Badge>;
    }
  };

  const getSeverityBadge = (sev: ConcernSeverity) => {
    switch (sev) {
      case 'Critical': return <Badge variant="danger" className="bg-rose-600 text-white">Critical</Badge>;
      case 'High': return <Badge variant="danger" className="bg-orange-500 text-white">High</Badge>;
      case 'Medium': return <Badge variant="warning">Medium</Badge>;
      default: return <Badge variant="default">Low</Badge>;
    }
  };

  // Calculate days open helper
  const getDaysOpen = (createdAt: string) => {
    try {
      const days = differenceInDays(new Date(), parseISO(createdAt));
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Filtering Header panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-2xl shadow-sm">
        
        {/* Status Filter */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Filter Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Severity Filter */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Filter Severity</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
          >
            <option value="All">All Severities</option>
            {severities.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Category Filter */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Filter Category</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
          >
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

      </div>

      {/* Concerns Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/50">
                <th className="px-5 py-4">Reference ID</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Severity</th>
                <th className="px-5 py-4">Title</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Days Open</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {filteredConcerns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Clipboard className="h-10 w-10 mx-auto text-slate-200 mb-2" />
                    No concerns logged matching these filters.
                  </td>
                </tr>
              ) : (
                filteredConcerns.map((concern) => (
                  <tr
                    key={concern.id}
                    onClick={() => openDrawer(concern)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-[10px] text-slate-500">
                      {concern.referenceId.slice(0, 8)}...
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      {concern.category}
                    </td>
                    <td className="px-5 py-4">
                      {getSeverityBadge(concern.severity)}
                    </td>
                    <td className="px-5 py-4 font-medium max-w-xs truncate text-slate-800 dark:text-slate-200">
                      {concern.title}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(concern.status)}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {getDaysOpen(concern.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button size="sm" variant="outline" className="text-[10px] py-1 px-2.5 rounded-lg">
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide out Management Drawer overlay */}
      <AnimatePresence>
        {selectedConcern && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            {/* Right Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between border-l border-slate-200/50 dark:border-slate-800/50"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30">
                <div className="space-y-1">
                  <Badge variant="primary" className="text-[9px] font-bold uppercase tracking-wider py-0.5 px-2">
                    Ref ID: {selectedConcern.referenceId.slice(0, 8)}
                  </Badge>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Manage Concern
                  </h3>
                </div>

                <button
                  onClick={closeDrawer}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                
                {/* Concern summary card */}
                <div className="space-y-2.5">
                  <div className="flex gap-2 items-center">
                    {getStatusBadge(selectedConcern.status)}
                    {getSeverityBadge(selectedConcern.severity)}
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      {selectedConcern.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-slate-950 dark:text-white leading-snug">
                    {selectedConcern.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/40 p-4 rounded-2xl">
                    {selectedConcern.description}
                  </p>
                </div>

                {/* Submitter info (restricted) */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-100/40 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/40 rounded-xl p-3.5">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submitter ID</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {selectedConcern.submitterId ? `User: ${selectedConcern.submitterId}` : 'Anonymous (Not disclosed)'}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Incident Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {selectedConcern.incidentDate ? new Date(selectedConcern.incidentDate).toLocaleDateString() : 'Not reported'}
                    </span>
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Update Details
                  </h5>

                  {/* Status Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Change Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ConcernStatus)}
                      className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Assignee Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Assign Admin Rep</label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                    >
                      <option value="">Unassigned</option>
                      <option value="user-3">Marcus Chen (Admin Coordinator)</option>
                      <option value="user-4">Amina Diop (Admin Director)</option>
                    </select>
                  </div>

                  {/* Admin Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Internal Notes (Admin only)</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                      placeholder="Add investigation logs, interview notes..."
                    />
                  </div>
                </div>

                {/* Audit log Timeline */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Audit Logs
                  </h5>
                  
                  <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 ml-2.5 space-y-4">
                    <div className="relative">
                      <span className="absolute -left-[22px] top-0 flex h-3 w-3 items-center justify-center rounded-full bg-primary-600 ring-4 ring-white dark:ring-slate-900" />
                      <div className="text-[10px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Ticket Created</span>
                        <span className="text-slate-400 ml-2">
                          {new Date(selectedConcern.createdAt).toLocaleDateString()}
                        </span>
                        <p className="text-slate-400 mt-0.5">Stripped IP & Submitter identifiers.</p>
                      </div>
                    </div>

                    {selectedConcern.adminNotes && (
                      <div className="relative">
                        <span className="absolute -left-[22px] top-0 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 ring-4 ring-white dark:ring-slate-900" />
                        <div className="text-[10px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Notes Updated by Admin</span>
                          <p className="text-slate-400 mt-0.5">Admin logged notes and action plan.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Drawer Action Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 flex gap-3">
                <Button variant="ghost" fullWidth onClick={closeDrawer} className="py-2.5 rounded-xl font-bold">
                  Cancel
                </Button>
                <Button variant="primary" fullWidth onClick={handleSaveDetails} className="py-2.5 rounded-xl font-bold">
                  Save Changes
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
