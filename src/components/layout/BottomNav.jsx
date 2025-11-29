import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, GraduationCap, Calendar } from 'lucide-react';

/**
 * Mobile Bottom Navigation Bar
 * 3 items: Home, Classes, Schedule
 * Tasks moved to Drawer (hamburger menu in TopNav)
 * Touch-friendly with 44px minimum targets
 */
export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/classes', icon: GraduationCap, label: 'Classes' },
    { path: '/schedule', icon: Calendar, label: 'Schedule' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item, index) => {
          const isActive = item.path && (
            location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
          );
          const Icon = item.icon;

          return (
            <NavLink
              key={index}
              to={item.path}
              className="relative flex flex-col items-center justify-center min-w-[80px] h-full"
            >
              {/* Active indicator pill */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-1.5 w-12 h-8 bg-indigo-100 rounded-xl"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              
              <motion.div 
                className={`relative p-2 rounded-xl transition-colors ${
                  isActive ? '' : 'hover:bg-slate-100'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                  strokeWidth={isActive ? 2 : 1.75}
                />
              </motion.div>
              <span
                className={`text-[10px] font-medium -mt-0.5 transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
