import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import Drawer from './Drawer';
import { useLayout } from '../../context/LayoutContext';
import { PersistentChatBar } from '../ai';

/**
 * Mobile Layout Shell
 * 
 * Structure:
 * - Top Nav (contextual title, back button)
 * - Scrollable content area
 * - Persistent Chat Bar (above bottom nav)
 * - Bottom Tab Bar (4 items)
 * - Drawer (accessed from More tab)
 * 
 * Note: Simplified animation to prevent blank screen on navigation
 */
export default function MobileLayout({ children, title, showBack, onBack, hideNav, hideChatbox }) {
  const location = useLocation();
  const { pageTitle, showBackButton, closeDrawer } = useLayout();
  const prevPathRef = useRef(location.pathname);

  // Use provided props or context values
  const displayTitle = title || pageTitle;
  const displayShowBack = showBack !== undefined ? showBack : showBackButton;

  // Pages that should hide navigation
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/login' || location.pathname === '/register';
  const shouldHideNav = hideNav || isLanding || isAuth;

  // Close drawer on route change
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      closeDrawer?.();
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname, closeDrawer]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-neutral-50 flex flex-col">
      {/* Top Navigation */}
      {!shouldHideNav && (
        <TopNav
          title={displayTitle}
          showBack={displayShowBack}
          onBack={onBack}
        />
      )}

      {/* Main Content - Simple fade animation without AnimatePresence */}
      <main
        className={`
          flex-1 overflow-y-auto overflow-x-hidden
          ${!shouldHideNav ? 'pb-36' : ''}
        `}
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          className="min-h-full"
        >
          {children}
        </motion.div>
      </main>

      {/* Persistent Chat Bar - Above Bottom Nav */}
      {!shouldHideNav && !hideChatbox && (
        <PersistentChatBar />
      )}

      {/* Bottom Navigation */}
      {!shouldHideNav && <BottomNav />}

      {/* Navigation Drawer */}
      <Drawer />
    </div>
  );
}
