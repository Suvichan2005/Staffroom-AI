import React from 'react';
import { useLocation } from 'react-router-dom';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import MobileLayout from './MobileLayout';
import DesktopLayout from './DesktopLayout';
import { FloatingHelpButton } from '../shared/FeatureTooltips';

// Map routes to help contexts
const HELP_CONTEXTS = {
  '/dashboard': 'dashboard',
  '/class': 'classPage',
  '/assessments': 'assessments',
  '/hod': 'hod',
  '/admin': 'dashboard'
};

/**
 * Responsive Layout Component
 * Automatically switches between Mobile and Desktop layouts based on screen size
 * 
 * Props:
 * - children: Page content
 * - title: Page title (mobile)
 * - showBack: Show back button (mobile)
 * - onBack: Back button handler
 * - hideNav: Hide all navigation
 * - hideChatbox: Hide AI chatbox
 */
export default function ResponsiveLayout({
  children,
  title,
  showBack,
  onBack,
  hideNav,
  hideChatbox,
}) {
  const { isMobile } = useMediaQuery();
  const location = useLocation();
  
  // Determine help context based on current route
  const getHelpContext = () => {
    for (const [route, context] of Object.entries(HELP_CONTEXTS)) {
      if (location.pathname.startsWith(route)) {
        return context;
      }
    }
    return 'dashboard';
  };

  // Don't show help button on auth pages
  const showHelp = !hideNav;

  if (isMobile) {
    return (
      <MobileLayout
        title={title}
        showBack={showBack}
        onBack={onBack}
        hideNav={hideNav}
        hideChatbox={hideChatbox}
      >
        {children}
        {showHelp && <FloatingHelpButton context={getHelpContext()} />}
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout hideNav={hideNav} hideChatbox={hideChatbox}>
      {children}
      {showHelp && <FloatingHelpButton context={getHelpContext()} />}
    </DesktopLayout>
  );
}

// Also export a HOC for wrapping page components
export function withResponsiveLayout(Component, layoutProps = {}) {
  return function WrappedComponent(props) {
    return (
      <ResponsiveLayout {...layoutProps}>
        <Component {...props} />
      </ResponsiveLayout>
    );
  };
}
