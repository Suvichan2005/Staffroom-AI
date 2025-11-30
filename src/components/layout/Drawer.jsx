import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  FolderOpen,
  LogOut,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  Bell,
  BookOpen,
  Calendar,
  MessageSquare,
  ChevronRight,
  ListTodo,
} from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';
import { useTeacher } from '../../context/TeacherContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../design-system';

/**
 * Mobile Navigation Drawer
 * Accessed from hamburger menu in TopNav - contains secondary navigation
 */
export default function Drawer() {
  const { drawerOpen, closeDrawer } = useLayout();
  const teacherCtx = useTeacher();
  const authCtx = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const teacher = teacherCtx?.teacher || { name: 'Teacher', role: 'teacher' };

  const primaryMenuItems = [
    { icon: BookOpen, label: 'My Classes', path: '/classes', description: 'View all classes' },
    { icon: Calendar, label: 'Schedule', path: '/schedule', description: 'View timetable' },
    { icon: ListTodo, label: 'Assessments', path: '/assessments', description: 'Tests & assignments' },
    { icon: FolderOpen, label: 'Resources', path: '/resources', description: 'Shared materials' },
    { icon: MessageSquare, label: 'AI Assistant', path: '/chat', description: 'Get help from AI' },
  ];

  const secondaryMenuItems = [
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: HelpCircle, label: 'Help & Support', path: '/help' },
  ];

  const roleOptions = [
    { id: 'teacher', label: 'Teacher', path: '/dashboard' },
    { id: 'hod', label: 'Head of Department', path: '/hod-dashboard' },
    { id: 'admin', label: 'IT Admin', path: '/admin-dashboard' },
  ];

  const handleNavigation = (path) => {
    closeDrawer();
    navigate(path);
  };

  const handleRoleSwitch = (role) => {
    teacherCtx?.setPersona?.(role.id);
    closeDrawer();
    navigate(role.path);
  };

  const handleLogout = async () => {
    closeDrawer();
    try {
      await authCtx?.logout?.();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="absolute inset-0 bg-black-900/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute top-0 left-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col"
            style={{ maxWidth: 'calc(100vw - 56px)' }}
          >
            {/* Header with Profile */}
            <div className="p-5 bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 text-white">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <span className="text-sm font-bold">S</span>
                  </div>
                  <span className="text-lg font-semibold">Staffroom</span>
                </div>
                <button
                  onClick={closeDrawer}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <button 
                onClick={() => handleNavigation('/profile')}
                className="flex items-center gap-3 p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors w-full text-left"
              >
                <Avatar
                  name={teacher.name}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{teacher.name}</p>
                  <p className="text-sm text-indigo-200 capitalize">
                    {teacher.role || 'Teacher'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-200" />
              </button>
            </div>

            {/* Main Menu */}
            <div className="flex-1 overflow-y-auto">
              {/* Primary Navigation */}
              <div className="p-3">
                <p className="px-3 py-2 text-xs font-semibold text-black-400 uppercase tracking-wider">
                  Navigation
                </p>
                <div className="space-y-1">
                  {primaryMenuItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                        ${isActive(item.path)
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-black-700 hover:bg-black-50'
                        }
                      `}
                    >
                      <div className={`
                        p-2 rounded-lg
                        ${isActive(item.path) ? 'bg-indigo-100' : 'bg-black-100'}
                      `}>
                        <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-indigo-600' : 'text-black-500'}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-black-500">{item.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Navigation */}
              <div className="p-3 border-t border-black-100">
                <div className="space-y-0.5">
                  {secondaryMenuItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                        ${isActive(item.path)
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-black-600 hover:bg-black-50'
                        }
                      `}
                    >
                      <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-indigo-600' : 'text-black-400'}`} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Switcher */}
              <div className="p-3 border-t border-black-100">
                <p className="px-3 py-2 text-xs font-semibold text-black-400 uppercase tracking-wider">
                  Switch Role
                </p>
                <div className="bg-black-50 rounded-xl p-2 space-y-1">
                  {roleOptions.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleRoleSwitch(role)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium
                        ${teacherCtx?.persona === role.id
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-black-600 hover:bg-white/50'
                        }
                        transition-all
                      `}
                    >
                      <span>{role.label}</span>
                      {teacherCtx?.persona === role.id && (
                        <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Menu */}
            <div className="border-t border-black-100 p-3 bg-black-50/50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
