import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-800/50 py-6 md:py-8 mt-auto">
      <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-6 max-w-7xl mx-auto gap-4">
        
        {/* Left: copyright */}
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center md:text-left">
          © {new Date().getFullYear()} Employee Wellbeing Platform. All rights reserved.
        </p>

        {/* Right: navigation links */}
        <nav className="flex items-center gap-6">
          <Link href="/help" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            Help Center
          </Link>
          <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            Terms of Service
          </Link>
        </nav>
        
      </div>
    </footer>
  );
};
