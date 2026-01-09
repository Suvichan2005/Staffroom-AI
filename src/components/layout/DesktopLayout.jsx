import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import { useLayout } from '../../context/LayoutContext';
import { DesktopChatBar } from '../ai';

/**
 * Desktop Layout Shell
 * 
 * Structure:
 * - Top Nav (logo, search, notifications, profile)
 * - Left Sidebar (collapsible navigation)
 * - Main Content Area
 * - Persistent Chat Bar (centered at bottom)
 * 
 * Note: Simplified animation to prevent blank screen on navigation
 */
export default function DesktopLayout({ children, hideNav, hideChatbox }) {
  const location = useLocation();
  const { sidebarCollapsed, closeDrawer } = useLayout();
  const prevPathRef = useRef(location.pathname);

  // Pages that should hide navigation
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/login' || location.pathname === '/register';
  const shouldHideNav = hideNav || isLanding || isAuth;

  // Close any open modals/drawers on route change
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      closeDrawer?.();
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname, closeDrawer]);

  // Full-width layout for landing/auth
  if (shouldHideNav) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <main>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top Navigation */}
      <TopNav />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className={`
          transition-all duration-300 ease-in-out pt-16 pb-24
          ${sidebarCollapsed ? 'ml-16' : 'ml-60'}
        `}
        style={{ minHeight: 'calc(100vh - 64px)' }}
      >
        <div className="p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Persistent Chat Bar - Centered at bottom */}
      {!hideChatbox && !shouldHideNav && <DesktopChatBar />}
    </div>
  );
}
