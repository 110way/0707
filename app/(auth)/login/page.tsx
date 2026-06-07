'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, CardBody, Badge } from '@/components/ui';
import { Sparkles, Lock, Mail, AlertTriangle, User, Briefcase, Shield, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();

  // Mode state: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDept, setRegDept] = useState('Engineering');
  const [regRole, setRegRole] = useState('employee');

  // Default demo accounts helper list
  const demoAccounts = [
    { email: 'rahul@company.com', role: 'employee' },
    { email: 'admin@company.com', role: 'admin' },
  ];

  const handleDemoClick = (demoEmail: string) => {
    setMode('login');
    setEmail(demoEmail);
    setPassword('Password123!');
    setError('');
    setSuccessMessage('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    // Simulated short timeout matching hooks
    setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        if (res.ok) {
          const success = await login(email.trim(), password);
          setIsLoading(false);
          if (success) {
            toast('Logged in successfully!', 'success');
            router.push('/');
          }
        } else {
          setIsLoading(false);
          const json = await res.json();
          setError(json.error || 'Invalid credentials.');
        }
      } catch (err) {
        setIsLoading(false);
        setError('Network error during sign-in.');
      }
    }, 600);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regDept || !regRole) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          department: regDept,
          role: regRole,
        }),
      });

      setIsLoading(false);
      const json = await res.json();

      if (res.ok) {
        setSuccessMessage(json.message);
        toast('Registration request submitted!', 'success');
        // Clear fields
        setRegName('');
        setRegEmail('');
        setRegPassword('');
      } else {
        setError(json.error || 'Registration failed.');
      }
    } catch (err) {
      setIsLoading(false);
      setError('Network error during registration.');
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient p-4">
      {/* Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card border-white/25 dark:border-slate-800/40 shadow-2xl relative overflow-visible">
          <CardBody className="p-8 space-y-6">
            
            {/* Success screen overlay */}
            {successMessage ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6 py-4"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Registration Submitted</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {successMessage}
                  </p>
                </div>
                <Button 
                  onClick={() => switchMode('login')} 
                  variant="primary" 
                  fullWidth
                  className="rounded-xl font-bold py-2.5 text-sm"
                >
                  Return to Sign In
                </Button>
              </motion.div>
            ) : (
              <>
                {/* Header branding */}
                <div className="text-center space-y-2">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white shadow-lg shadow-primary-500/20">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {mode === 'login' 
                      ? 'Sign in to manage your wellbeing activities.' 
                      : 'Request platform access from your administrator.'}
                  </p>
                </div>

                {/* Error dialog */}
                {error && (
                  <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs">
                    <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                    <p className="font-semibold">{error}</p>
                  </div>
                )}

                {/* Toggle controls tab */}
                <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200/20 dark:border-slate-800">
                  <button
                    onClick={() => switchMode('login')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      mode === 'login' 
                        ? 'bg-white dark:bg-slate-805 text-primary-600 dark:text-primary-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => switchMode('register')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      mode === 'register' 
                        ? 'bg-white dark:bg-slate-805 text-primary-600 dark:text-primary-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    Register
                  </button>
                </div>

                {/* Forms Rendering */}
                {mode === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Corporate Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="e.g., employee@company.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isLoading}
                      className="py-2.5 rounded-xl font-bold text-sm"
                    >
                      Sign In
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="e.g., Sarah Jenkins"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Corporate Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="e.g., sarah@company.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          Department
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                          <select
                            value={regDept}
                            onChange={(e) => setRegDept(e.target.value)}
                            className="w-full pl-8 pr-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer font-medium text-slate-700 dark:text-slate-350"
                          >
                            {['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Support', 'Operations', 'Legal', 'People & Culture'].map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          Desired Role
                        </label>
                        <div className="relative">
                          <Shield className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                          <select
                            value={regRole}
                            onChange={(e) => setRegRole(e.target.value)}
                            className="w-full pl-8 pr-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer font-medium text-slate-700 dark:text-slate-350"
                          >
                            <option value="employee">Employee</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isLoading}
                      className="py-2.5 rounded-xl font-bold text-sm"
                    >
                      Request Registration
                    </Button>
                  </form>
                )}

                {/* Quick Demo selectors */}
                <div className="space-y-3 pt-4 border-t border-slate-200/50 dark:border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                    Quick Sign-In Demo Accounts
                  </span>
                  <div className="flex flex-col gap-2">
                    {demoAccounts.map((acc) => (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => handleDemoClick(acc.email)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 border border-slate-200/50 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-left transition-colors font-medium text-slate-700 dark:text-slate-300"
                      >
                        <span>{acc.email}</span>
                        <Badge variant={acc.role === 'admin' ? 'danger' : 'default'} className="capitalize font-bold text-[9px] py-0.5 px-2">
                          {acc.role}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
