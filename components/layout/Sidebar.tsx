'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  ClipboardList, 
  MessageSquare, 
  ShieldAlert, 
  Award, 
  Coins, 
  BarChart3,
  X,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navLinks = [
    { href: '/', label: 'Home', icon: Home, roles: ['employee', 'admin'] },
    { href: '/surveys', label: 'Surveys', icon: ClipboardList, roles: ['employee', 'admin'] },
    { href: '/forum', label: 'Forum', icon: MessageSquare, roles: ['employee', 'admin'] },
    { href: '/concerns', label: 'Concerns', icon: ShieldAlert, roles: ['employee', 'admin'] },
    { href: '/recognition', label: 'Recognition', icon: Award, roles: ['employee', 'admin'] },
    { href: '/konnect', label: 'Konnect', icon: Coins, roles: ['employee', 'admin'] },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin'] },
  ];

  const filteredLinks = navLinks.filter(
    (link) => user && link.roles.includes(user.role)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800/50 w-64">
      {/* Header for Mobile Drawer */}
      <div className="flex md:hidden h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/50">
        <Link href="/" onClick={onClose} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-500 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="font-bold text-slate-900 dark:text-white">Wellbeing</span>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close sidebar"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {filteredLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/45'
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 text-center text-xs text-slate-400 dark:text-slate-500">
        © 2026 Wellbeing App
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer (with Backdrop overlay) */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="relative z-10 flex flex-col h-full"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (Fixed Left Layout) */}
      <aside className="hidden md:block fixed top-16 bottom-0 left-0 z-30">
        {sidebarContent}
      </aside>
    </>
  );
};
