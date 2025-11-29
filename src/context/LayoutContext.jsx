import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * Layout Context - Manages layout state across the app
 * 
 * Provides:
 * - Sidebar open/collapsed state
 * - Mobile drawer state
 * - Chat panel state
 * - Layout mode (mobile/desktop)
 */
const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  // Sidebar state (desktop)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // AI Chat panel state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatPosition, setChatPosition] = useState('floating'); // 'floating' | 'docked' | 'fullscreen'
  
  // Page-level state
  const [pageTitle, setPageTitle] = useState('');
  const [showBackButton, setShowBackButton] = useState(false);
  const [backPath, setBackPath] = useState(null);

  // Toggle functions
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setChatOpen((prev) => !prev);
  }, []);

  const openChat = useCallback(() => {
    setChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setChatOpen(false);
    setChatExpanded(false);
  }, []);

  const expandChat = useCallback(() => {
    setChatExpanded(true);
  }, []);

  const collapseChat = useCallback(() => {
    setChatExpanded(false);
  }, []);

  // Update page config
  const setPageConfig = useCallback(({ title, showBack, backTo }) => {
    if (title !== undefined) setPageTitle(title);
    if (showBack !== undefined) setShowBackButton(showBack);
    if (backTo !== undefined) setBackPath(backTo);
  }, []);

  // Close drawer on route change (handled externally)
  const handleRouteChange = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Close drawer on Escape
      if (event.key === 'Escape') {
        if (drawerOpen) {
          setDrawerOpen(false);
        } else if (chatExpanded) {
          setChatExpanded(false);
        } else if (chatOpen) {
          setChatOpen(false);
        }
      }

      // Toggle chat with Ctrl/Cmd + K
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        toggleChat();
      }

      // Toggle sidebar with Ctrl/Cmd + B
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen, chatOpen, chatExpanded, toggleChat, toggleSidebar]);

  const value = {
    // Sidebar
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,

    // Drawer
    drawerOpen,
    setDrawerOpen,
    toggleDrawer,
    openDrawer,
    closeDrawer,

    // Chat
    chatOpen,
    setChatOpen,
    chatExpanded,
    setChatExpanded,
    chatPosition,
    setChatPosition,
    toggleChat,
    openChat,
    closeChat,
    expandChat,
    collapseChat,

    // Page
    pageTitle,
    setPageTitle,
    showBackButton,
    setShowBackButton,
    backPath,
    setBackPath,
    setPageConfig,

    // Handlers
    handleRouteChange,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}

export default LayoutContext;
