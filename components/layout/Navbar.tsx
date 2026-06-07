'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Badge, Dropdown } from '@/components/ui';
import { motion } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Menu, 
  Coins, 
  User,
  LogOut,
  Sparkles,
  Search
} from 'lucide-react';
import { useTheme as useNextTheme } from 'next-themes';
import { SearchPalette } from './SearchPalette';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, setRole, logout } = useAuth();
  const { theme, setTheme } = useNextTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  // Monitor global Ctrl+K or Cmd+K keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        
        {/* Left Side: Hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white shadow-md shadow-primary-500/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
              Wellbeing
            </span>
          </Link>
        </div>

        {/* Center: Sleek Search Bar Trigger */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl text-xs border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-550 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-all duration-200 group shadow-inner"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-450 group-hover:text-primary-500 dark:text-slate-500 transition-colors" />
              <span>Search content, features, guides...</span>
            </div>
            <span className="flex items-center gap-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 border border-slate-250/20 dark:border-slate-700 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500">
              Ctrl+K
            </span>
          </button>
        </div>

        {/* Right Side: Actions & Settings */}
        <div className="flex items-center gap-3">
          {/* Mobile Search Icon Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850"
            aria-label="Search"
          >
            <Search className="h-4.5 w-4.5" />
          </button>
          {/* Quick Role Toggle */}
          {user && user.roles && user.roles.length > 1 && (
            <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200/50 dark:border-slate-800/50">
              {user.roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    user.role === r
                      ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Points Balance Badge */}
          {user && (
            <Link href="/konnect">
              <Badge variant="primary" className="flex items-center gap-1 py-1.5 px-3 rounded-xl border border-primary-200/20 shadow-sm shadow-primary-500/5 animate-pulse hover:animate-none">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-bold">{user.pointsBalance} pts</span>
              </Badge>
            </Link>
          )}

          {/* Theme Toggle Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent dark:border-transparent dark:hover:border-slate-800"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </motion.button>

          {/* Profile Dropdown */}
          {user && (
            <Dropdown
              align="right"
              trigger={
                <button className="flex items-center gap-2 focus:outline-none" aria-label="User profile">
                  <Avatar name={user.name} size="sm" />
                </button>
              }
              items={[
                {
                  id: 'profile',
                  label: `${user.name} (${user.role})`,
                  onClick: () => {},
                  icon: <User className="h-4 w-4" />,
                },
                ...(user.roles && user.roles.includes('employee') && user.role !== 'employee'
                  ? [{
                      id: 'role-emp',
                      label: 'Switch to Employee',
                      onClick: () => setRole('employee'),
                      icon: <Sparkles className="h-4 w-4" />,
                    }]
                  : []),
                ...(user.roles && user.roles.includes('admin') && user.role !== 'admin'
                  ? [{
                      id: 'role-admin',
                      label: 'Switch to Admin',
                      onClick: () => setRole('admin'),
                      icon: <Sparkles className="h-4 w-4" />,
                    }]
                  : []),
                {
                  id: 'logout',
                  label: 'Sign Out',
                  onClick: logout,
                  icon: <LogOut className="h-4 w-4" />,
                  danger: true,
                },
              ]}
            />
          )}
        </div>

      </div>

      {/* Global Command Palette Overlay */}
      <SearchPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
};
