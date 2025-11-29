import React from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import MobileLayout from './MobileLayout';
import DesktopLayout from './DesktopLayout';

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
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout hideNav={hideNav} hideChatbox={hideChatbox}>
      {children}
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
