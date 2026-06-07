'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  MessageSquare, 
  ShieldAlert, 
  Award, 
  Coins, 
  BarChart3, 
  ArrowRight,
  Shield,
  Heart,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardBody, Button, Badge } from '@/components/ui';

// Custom CountUp Component for premium numeric increments
const CountUp: React.FC<{ end: number; duration?: number }> = ({ end, duration = 1.5 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count}</span>;
};

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeSurveys: 0,
    totalRecognitions: 0,
    activeEmployees: 0,
  });

  useEffect(() => {
    const fetchPublicStats = async () => {
      try {
        const res = await fetch('/api/public-stats');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setStats(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load landing page stats:', err);
      }
    };

    if (user) {
      fetchPublicStats();
    }
  }, [user]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } },
  };

  // Modules catalog
  const modules = [
    {
      title: 'Surveys & Check-ins',
      href: '/surveys',
      description: 'Share your feedback, report stress levels, and complete surveys to earn reward points.',
      icon: ClipboardList,
      color: 'from-blue-500 to-indigo-500',
      badge: 'Earn 20+ pts',
      roles: ['employee', 'admin'],
    },
    {
      title: 'Open Forum',
      href: '/forum',
      description: 'Discuss workload, suggestions, or team topics openly with your colleagues.',
      icon: MessageSquare,
      color: 'from-purple-500 to-pink-500',
      badge: 'Earn 5 pts',
      roles: ['employee', 'admin'],
    },
    {
      title: 'Anonymous Concerns',
      href: '/concerns',
      description: 'Securely submit workplace concerns to HR with complete anonymity.',
      icon: ShieldAlert,
      color: 'from-rose-500 to-orange-500',
      badge: '100% Secure',
      roles: ['employee', 'admin'],
    },
    {
      title: 'Peer Recognition',
      href: '/recognition',
      description: 'Celebrate colleagues, send appreciation badges, and share success logs.',
      icon: Award,
      color: 'from-amber-500 to-yellow-500',
      badge: 'Earn 10 pts',
      roles: ['employee', 'admin'],
    },
    {
      title: 'Konnect Rewards',
      href: '/konnect',
      description: 'Redeem your points balance for 1:1 sessions, career chats, and mentorship.',
      icon: Coins,
      color: 'from-emerald-500 to-teal-500',
      badge: 'Redeem Points',
      roles: ['employee', 'admin'],
    },
    {
      title: 'Analytics Dashboard',
      href: '/dashboard',
      description: 'Access aggregated responses, concern analytics, and sentiment heatmap insights.',
      icon: BarChart3,
      color: 'from-violet-600 to-primary-600',
      badge: 'Admin Only',
      roles: ['admin'],
    },
  ];

  // Filter modules based on user role
  const activeModules = modules.filter(
    (mod) => user && mod.roles.includes(user.role)
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12 pb-12"
    >
      {/* 1. Hero Banner */}
      <motion.div 
        variants={itemVariants} 
        className="relative overflow-hidden rounded-3xl animated-gradient p-8 md:p-14 text-white shadow-xl shadow-indigo-500/10"
      >
        <div className="relative z-10 max-w-2xl space-y-6">
          <Badge className="bg-white/20 text-white border-none backdrop-blur-md px-3 py-1 text-xs font-semibold">
            ✨ Employee Centered App
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Foster a workplace where everyone thrives.
          </h1>
          <p className="text-lg text-white/85 max-w-xl font-normal leading-relaxed">
            Welcome, <span className="font-bold">{user?.name || 'Friend'}</span>! Connect with colleagues, share anonymous feedback, praise your peers, and track your wellness checkpoints.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link href="/surveys">
              <Button size="lg" variant="secondary" className="bg-white text-primary-700 hover:bg-slate-100 font-bold">
                Explore Surveys
              </Button>
            </Link>
            <Link href="/recognition">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 border border-white/20 font-semibold">
                Give Recognition
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Glow decoration */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-white/10 to-transparent pointer-events-none" />
      </motion.div>

      {/* 2. Stats Counter Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Surveys', value: stats.activeSurveys, labelColor: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Total Recognitions', value: stats.totalRecognitions, labelColor: 'text-amber-500 dark:text-amber-400' },
          { label: 'Active Employees', value: stats.activeEmployees, labelColor: 'text-emerald-500 dark:text-emerald-400' },
        ].map((stat, idx) => (
          <Card key={idx} hoverEffect className="border-slate-200/50 dark:border-slate-800/50">
            <CardBody className="flex flex-col items-center justify-center text-center p-8 space-y-2">
              <span className={`text-4xl md:text-5xl font-black ${stat.labelColor}`}>
                <CountUp end={stat.value} />
              </span>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </span>
            </CardBody>
          </Card>
        ))}
      </motion.div>

      {/* 3. Module Cards Grid */}
      <div className="space-y-6">
        <div className="flex flex-col space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Explore Wellbeing Hub
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Access the core hubs for surveys, feedback loops, peer rewards, and more.
          </p>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
        >
          {activeModules.map((mod, index) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.title}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Link href={mod.href} className="block h-full">
                  <Card className="h-full hover:shadow-lg dark:hover:border-primary-500/30 transition-all duration-300 group border-slate-200/60 dark:border-slate-800/60">
                    <CardBody className="p-6 flex flex-col justify-between h-full space-y-6">
                      <div className="space-y-4">
                        {/* Header: Icon & Badge */}
                        <div className="flex items-center justify-between">
                          <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr ${mod.color} text-white shadow-md shadow-slate-500/10`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                            {mod.badge}
                          </Badge>
                        </div>

                        {/* Title & description */}
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {mod.title}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      {/* CTA link */}
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700">
                        Get Started
                        <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                      </span>
                    </CardBody>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* 4. Benefits Row */}
      <motion.div 
        variants={itemVariants} 
        className="bg-slate-100/50 dark:bg-slate-900/40 rounded-3xl p-8 border border-slate-200/40 dark:border-slate-800/40"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Anonymous Feedback',
              description: 'Report concerns securely with strict server-side anonymization. Your identity is fully protected.',
              icon: Shield,
              color: 'text-rose-500',
            },
            {
              title: 'Peer Recognition',
              description: 'Celebrate positive interactions. Send badges and appreciation tokens directly to your teammates.',
              icon: Heart,
              color: 'text-indigo-500',
            },
            {
              title: 'Data-Driven Insights',
              description: 'Aggregated summaries provide real-time wellness, workload levels, and satisfaction scores directly to administrators.',
              icon: TrendingUp,
              color: 'text-emerald-500',
            },
          ].map((benefit, idx) => {
            const BenefitIcon = benefit.icon;
            return (
              <div key={idx} className="flex flex-col items-center text-center space-y-3 p-4">
                <span className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm ${benefit.color}`}>
                  <BenefitIcon className="h-6 w-6" />
                </span>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  {benefit.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
