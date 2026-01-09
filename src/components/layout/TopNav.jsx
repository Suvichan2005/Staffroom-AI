import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Calendar,
  AlertTriangle,
  FileText,
  Users,
  Check,
  CheckCheck,
  Menu,
  Trash2,
  X,
} from 'lucide-react';
import { useTeacher } from '../../context/TeacherContext';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../context/LayoutContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Avatar, CountBadge } from '../design-system';
import { 
  getUserNotifications,
  saveUserNotifications,
  formatNotificationTime
} from '../../data/dummyData';

/**
 * Top Navigation Bar
 * Desktop: Full navigation with search, notifications, profile
 * Mobile: Simplified with back button and title
 */
export default function TopNav({ title, showBack, onBack, rightAction }) {
  const { isMobile } = useMediaQuery();
  const location = useLocation();
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const authCtx = useAuth();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const teacher = teacherCtx?.teacher || { name: 'Teacher' };
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/login' || location.pathname === '/register';
  
  // Load notifications from user-scoped storage
  useEffect(() => {
    const loadNotifications = () => {
      const userNotifs = getUserNotifications();
      setNotifications(userNotifs || []);
    };
    loadNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'meeting': return Calendar;
      case 'event': return Calendar;
      case 'alert': return AlertTriangle;
      case 'submission': return FileText;
      case 'update': return Bell;
      default: return Bell;
    }
  };

  // Handle notification click
  const handleNotificationClick = useCallback((notification) => {
    const updated = notifications.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    saveUserNotifications(updated);
    setShowNotifications(false);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  }, [notifications, navigate]);

  // Handle mark all read
  const handleMarkAllRead = useCallback(() => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveUserNotifications(updated);
  }, [notifications]);

  // Handle delete notification
  const handleDeleteNotification = useCallback((e, notifId) => {
    e.stopPropagation();
    const updated = notifications.filter(n => n.id !== notifId);
    setNotifications(updated);
    saveUserNotifications(updated);
  }, [notifications]);

  // Handle clear all notifications
  const handleClearAll = useCallback(() => {
    setNotifications([]);
    saveUserNotifications([]);
    setShowNotifications(false);
  }, []);

  // Don't show nav on landing or auth pages
  if (isLanding || isAuth) {
    return (
      <header className="sticky top-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="h-9 w-9 grid place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow font-bold">
              S
            </span>
            <span className="font-semibold text-neutral-800 tracking-tight">Staffroom</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
    );
  }

  const layoutCtx = useLayout();
  const openDrawer = layoutCtx?.openDrawer;
  const toggleSidebar = layoutCtx?.toggleSidebar;

  // Mobile Top Nav
  if (isMobile) {
    
    return (
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="px-4 h-14 flex items-center justify-between">
          {/* Left side - Hamburger or Back button */}
          <div className="flex items-center gap-2">
            {showBack ? (
              <button
                onClick={onBack || (() => navigate(-1))}
                className="p-2 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => openDrawer?.()}
                className="p-2 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            {/* Logo/Title */}
            {title ? (
              <h1 className="font-semibold text-neutral-800 truncate max-w-[180px]">
                {title}
              </h1>
            ) : (
              <Link to="/dashboard" className="flex items-center gap-2">
                <span className="h-8 w-8 grid place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow text-sm font-bold">
                  S
                </span>
                <span className="font-semibold text-neutral-800 text-sm">Staffroom</span>
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <CountBadge count={unreadCount} className="absolute -top-0.5 -right-0.5" />
                )}
              </button>

              {/* Mobile Notification Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-neutral-200 z-50 max-h-96 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                        <p className="font-semibold text-neutral-800">Notifications</p>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              <CheckCheck className="w-3 h-3" />
                              Mark read
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={handleClearAll}
                              className="text-xs text-red-500 hover:underline flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-72">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Bell className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                            <p className="text-sm text-neutral-500">No notifications</p>
                            <p className="text-xs text-neutral-400 mt-1">You're all caught up!</p>
                          </div>
                        ) : (
                          notifications.slice(0, 8).map((notif) => {
                            const Icon = getNotificationIcon(notif.type);
                            return (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`
                                  w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors cursor-pointer
                                  border-b border-neutral-50 last:border-b-0 group
                                  ${!notif.read ? 'bg-indigo-50/50' : ''}
                                `}
                              >
                                <div className="flex gap-3">
                                  <div className={`
                                    p-2 rounded-lg flex-shrink-0
                                    ${notif.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-600'}
                                  `}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className={`text-sm truncate ${!notif.read ? 'font-semibold text-neutral-800' : 'text-neutral-700'}`}>
                                        {notif.title}
                                      </p>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {!notif.read && (
                                          <span className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5" />
                                        )}
                                        <button
                                          onClick={(e) => handleDeleteNotification(e, notif.id)}
                                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-100 rounded transition-all"
                                          title="Delete"
                                        >
                                          <X className="w-3 h-3 text-neutral-400" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">{notif.message}</p>
                                    <p className="text-[10px] text-neutral-400 mt-1">{formatNotificationTime(notif.timestamp)}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-neutral-100 bg-neutral-50 text-center">
                          <p className="text-xs text-neutral-500">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'} – {notifications.length} total
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            {rightAction}
          </div>
        </div>
      </header>
    );
  }

  // Desktop Top Nav
  return (
    <header className="sticky top-0 z-40 h-16 bg-white border-b border-neutral-200">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="h-9 w-9 grid place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow font-bold">
              S
            </span>
            <span className="font-semibold text-neutral-800 tracking-tight text-lg">
              Staffroom
            </span>
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <CountBadge count={unreadCount} className="absolute -top-0.5 -right-0.5" />
              )}
            </button>

            {/* Desktop Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 z-50 overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                      <div>
                        <p className="font-bold text-neutral-800">Notifications</p>
                        <p className="text-xs text-neutral-500">{unreadCount} unread</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/50 transition-colors"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Mark read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={handleClearAll}
                            className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-80">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                          <div className="w-12 h-12 mx-auto bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                            <Bell className="w-6 h-6 text-neutral-400" />
                          </div>
                          <p className="text-sm text-neutral-500">No notifications</p>
                          <p className="text-xs text-neutral-400 mt-1">You're all caught up!</p>
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const Icon = getNotificationIcon(notif.type);
                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`
                                w-full px-5 py-4 text-left hover:bg-neutral-50 transition-colors cursor-pointer
                                border-b border-neutral-100 last:border-b-0 group
                                ${!notif.read ? 'bg-indigo-50/30' : ''}
                              `}
                            >
                              <div className="flex gap-3">
                                <div className={`
                                  p-2.5 rounded-xl flex-shrink-0
                                  ${notif.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-600'}
                                `}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm ${!notif.read ? 'font-semibold text-neutral-800' : 'text-neutral-700'}`}>
                                      {notif.title}
                                    </p>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {!notif.read && (
                                        <span className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5" />
                                      )}
                                      <button
                                        onClick={(e) => handleDeleteNotification(e, notif.id)}
                                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-100 rounded transition-all"
                                        title="Delete"
                                      >
                                        <X className="w-3.5 h-3.5 text-neutral-400" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{notif.message}</p>
                                  <p className="text-[11px] text-neutral-400 mt-2">{formatNotificationTime(notif.timestamp)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/50 text-center">
                        <p className="text-xs text-neutral-500">
                          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'} – {notifications.length} total
                        </p>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              <Avatar name={teacher.name} src={teacher.photoURL} size="sm" />
              <span className="text-sm font-medium text-neutral-700 hidden lg:block">
                {teacher.name || 'Teacher'}
              </span>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50"
                  >
                    {/* Profile Info */}
                    <div className="px-4 py-3 border-b border-neutral-100">
                      <p className="font-medium text-neutral-800">{teacher.name}</p>
                      <p className="text-sm text-neutral-500">Teacher</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate('/profile');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-3"
                      >
                        <User className="w-4 h-4 text-neutral-400" />
                        View Profile
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate('/settings');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-3"
                      >
                        <Settings className="w-4 h-4 text-neutral-400" />
                        Settings
                      </button>
                    </div>

                    {/* Role Switcher */}
                    <div className="border-t border-neutral-100 py-2">
                      <p className="px-4 py-1 text-xs font-semibold text-neutral-400 uppercase">
                        Switch Role
                      </p>
                      {[
                        { id: 'teacher', label: 'Teacher', path: '/dashboard' },
                        { id: 'hod', label: 'Head of Dept', path: '/hod-dashboard' },
                        { id: 'admin', label: 'IT Admin', path: '/admin-dashboard' },
                      ].map((role) => (
                        <button
                          key={role.id}
                          onClick={() => {
                            teacherCtx?.setPersona?.(role.id);
                            setShowProfileMenu(false);
                            navigate(role.path);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50"
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-neutral-100 pt-2">
                      <button
                        onClick={async () => {
                          setShowProfileMenu(false);
                          await authCtx?.logout?.();
                          navigate('/');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
