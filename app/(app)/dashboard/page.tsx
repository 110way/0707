'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { Card, CardHeader, CardBody, CardTitle, Badge } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { 
  ClipboardList, 
  AlertTriangle, 
  Award, 
  Coins, 
  BarChart3,
  Loader2,
  Check
} from 'lucide-react';

// Import Recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState('30d');
  const [department, setDepartment] = useState('All');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pending Registrations Approvals
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [approvalLoadingId, setApprovalLoadingId] = useState<string | null>(null);

  const fetchPendingRegistrations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users/pending');
      if (res.ok) {
        const json = await res.json();
        setPendingRegistrations(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending users:', err);
    }
  }, []);

  const handleResolveRegistration = async (targetUserId: string, status: 'approved' | 'declined') => {
    setApprovalLoadingId(targetUserId);
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast(`Successfully ${status} the user registration!`, 'success');
        // Refresh local registrations
        setPendingRegistrations((prev) => prev.filter((u) => u.id !== targetUserId));
      } else {
        const json = await res.json();
        toast(json.error || 'Failed to update user status.', 'error');
      }
    } catch (err) {
      console.error('Failed to resolve registration:', err);
      toast('Network error during user approval.', 'error');
    } finally {
      setApprovalLoadingId(null);
    }
  };

  // Role Protection
  useEffect(() => {
    if (user && user.role === 'employee') {
      router.push('/');
    }
  }, [user, router]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL('/api/dashboard/stats', window.location.origin);
      url.searchParams.set('days', dateRange.replace('d', ''));
      url.searchParams.set('department', department);

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, department]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchStats();
      fetchPendingRegistrations();
    }
  }, [user, fetchStats, fetchPendingRegistrations]);

  if (!user || user.role === 'employee') {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Sentiment donut colors
  const SENTIMENT_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const CONCERN_COLORS = ['#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b', '#ef4444', '#6b7280'];

  // Simulated heat map dates for the past 12 weeks (7 days x 12 weeks)
  const heatmapWeeks = Array.from({ length: 12 }, (_, wIdx) => {
    return Array.from({ length: 7 }, (_, dIdx) => {
      const rand = Math.random();
      const count = rand > 0.8 ? Math.floor(rand * 8) : rand > 0.5 ? 2 : 0;
      return { count };
    });
  });

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-primary-500" />
            Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time workplace wellbeing checkpoints, anonymous concerns, and engagement trends.
          </p>
        </div>

        {/* Filters control bar */}
        <div className="flex items-center gap-3 self-start md:self-auto bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-1.5 rounded-xl shadow-sm">
          {/* Range filter buttons */}
          <div className="flex bg-slate-100 dark:bg-slate-950 rounded-lg p-0.5 text-xs font-semibold">
            {['7d', '30d', '90d'].map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  dateRange === r
                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Department Filter dropdown */}
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="text-xs font-semibold px-2 py-1 bg-transparent border-l border-slate-200 dark:border-slate-800 focus:outline-none"
          >
            <option value="All">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Design">Design</option>
            <option value="Product">Product</option>
            <option value="Marketing">Marketing</option>
          </select>
        </div>
      </div>

      {loading || !stats ? (
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          {/* 1. Top KPI rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              label="Active Surveys"
              value={stats.surveys.active}
              trend={10}
              icon={ClipboardList}
              color="blue"
            />
            <KpiCard
              label="Open Concerns"
              value={stats.concerns.open}
              trend={-15}
              icon={AlertTriangle}
              color="red"
            />
            <KpiCard
              label="Recognitions Given"
              value={stats.recognition.thisMonth}
              trend={24}
              icon={Award}
              color="amber"
            />
            <KpiCard
              label="Reward Points Issued"
              value={stats.konnect.totalPoints}
              trend={8}
              icon={Coins}
              color="green"
            />
          </div>

          {/* 2. AI & Aggregated insights */}
          <AIInsightsPanel insights={stats.insights} />

          {/* 3. Surveys & Sentiment Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            
            {/* Survey Response rate (6 Cols) */}
            <Card className="lg:col-span-6 border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xs uppercase font-bold text-slate-400">
                  Survey response rates
                </CardTitle>
              </CardHeader>
              <CardBody className="p-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.surveys.responseRates}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="rate" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            {/* Sentiment breakdown donut (4 Cols) */}
            <Card className="lg:col-span-4 border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xs uppercase font-bold text-slate-400">
                  Sentiment index breakdown
                </CardTitle>
              </CardHeader>
              <CardBody className="p-4 h-[300px] flex flex-col justify-between">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie
                        data={stats.surveys.sentiment}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.surveys.sentiment.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex justify-center gap-6 text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  {stats.surveys.sentiment.map((s: any, idx: number) => (
                    <span key={s.name} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS[idx] }} />
                      {s.name} ({s.value}%)
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>

          </div>

          {/* 4. Concerns & Trends section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Category distribution donut */}
            <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xs uppercase font-bold text-slate-400">
                  Concerns categories logged
                </CardTitle>
              </CardHeader>
              <CardBody className="p-4 h-[300px] flex flex-col justify-between">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie
                        data={stats.concerns.categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {stats.concerns.categories.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CONCERN_COLORS[index % CONCERN_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  {stats.concerns.categories.map((c: any, idx: number) => (
                    <span key={c.name} className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CONCERN_COLORS[idx % CONCERN_COLORS.length] }} />
                      {c.name} ({c.value})
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Monthly Trend Area chart */}
            <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xs uppercase font-bold text-slate-400">
                  Concerns monthly ticket trends
                </CardTitle>
              </CardHeader>
              <CardBody className="p-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.concerns.trend}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#f43f5e" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

          </div>

          {/* 5. Forum heatmap & Appreciations */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            
            {/* Forum Heatmap commit-graph layout (6 Cols) */}
            <Card className="lg:col-span-6 border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xs uppercase font-bold text-slate-400">
                  Forum Posting Activity (Heatmap)
                </CardTitle>
              </CardHeader>
              <CardBody className="p-6">
                <div className="flex gap-3 items-start overflow-x-auto pb-2">
                  
                  {/* Day Labels */}
                  <div className="flex flex-col justify-between text-[9px] font-bold text-slate-400 h-[100px] pt-1">
                    {daysOfWeek.map((day, dIdx) => (
                      <span key={day} className={dIdx % 2 === 0 ? 'opacity-100' : 'opacity-0'}>
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Heatmap Grid boxes */}
                  <div className="flex gap-1.5">
                    {heatmapWeeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-1.5">
                        {week.map((day, dIdx) => {
                          const getColor = (count: number) => {
                            if (count >= 5) return 'bg-primary-600';
                            if (count >= 3) return 'bg-primary-400';
                            if (count >= 1) return 'bg-primary-200 dark:bg-primary-950/40';
                            return 'bg-slate-100 dark:bg-slate-900';
                          };

                          return (
                            <div
                              key={dIdx}
                              title={`${day.count} posts logged`}
                              className={`h-3 w-3 rounded-sm transition-all hover:ring-2 hover:ring-primary-500/50 cursor-pointer ${getColor(
                                day.count
                              )}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                </div>
                
                {/* Guide labels */}
                <div className="flex items-center justify-end gap-1.5 text-[9px] text-slate-400 font-bold uppercase pt-4">
                  <span>Less</span>
                  <span className="h-2.5 w-2.5 bg-slate-100 dark:bg-slate-900 rounded-sm" />
                  <span className="h-2.5 w-2.5 bg-primary-200 rounded-sm" />
                  <span className="h-2.5 w-2.5 bg-primary-400 rounded-sm" />
                  <span className="h-2.5 w-2.5 bg-primary-600 rounded-sm" />
                  <span>More</span>
                </div>
              </CardBody>
            </Card>

            {/* Recognition Badge Radar Chart (4 Cols) */}
            <Card className="lg:col-span-4 border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xs uppercase font-bold text-slate-400">
                  Kudos Badge Allocations
                </CardTitle>
              </CardHeader>
              <CardBody className="p-2 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.recognition.categories}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="name" fontSize={9} tick={{ fill: '#888888' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 15]} fontSize={8} />
                    <Radar name="Badges" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

          </div>

          {/* Pending Registrations Admin Approval Table */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm mt-8">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/30 pb-4">
              <div>
                <CardTitle className="text-xs uppercase font-bold text-slate-400">
                  Registration Approval Queue
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-1 normal-case font-normal">
                  Registered users must be approved by an administrator before they can log in.
                </p>
              </div>
              <Badge variant="primary" className="rounded-xl px-3 py-1 font-bold text-xs">
                {pendingRegistrations.length} Requests
              </Badge>
            </CardHeader>
            <CardBody className="p-0 overflow-x-auto">
              {pendingRegistrations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 text-slate-450 mb-3">
                    <Check className="h-5 w-5 text-emerald-500" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Queue is Empty</h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-normal">
                    There are currently no new employee registration requests pending administrator review.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/40 text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                      <th className="p-4 pl-6">Employee Details</th>
                      <th className="p-4">Desired Role</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Registration Date</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                    {pendingRegistrations.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-slate-900 dark:text-white">{request.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{request.email}</div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant={request.role === 'admin' ? 'danger' : 'default'} 
                            className="capitalize font-bold text-[10px] py-0.5 px-2 rounded-lg"
                          >
                            {request.role}
                          </Badge>
                        </td>
                        <td className="p-4 font-medium text-slate-750 dark:text-slate-300">{request.department}</td>
                        <td className="p-4 text-slate-500">
                          {new Date(request.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={approvalLoadingId !== null}
                              onClick={() => handleResolveRegistration(request.id, 'declined')}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-white border border-rose-250 dark:border-rose-900/40 hover:bg-rose-600 rounded-lg transition-all disabled:opacity-50"
                            >
                              Decline
                            </button>
                            <button
                              disabled={approvalLoadingId !== null}
                              onClick={() => handleResolveRegistration(request.id, 'approved')}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-500/10 transition-all disabled:opacity-50"
                            >
                              Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </>
      )}

    </div>
  );
}
