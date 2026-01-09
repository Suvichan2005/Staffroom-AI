import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  ListTodo,
  GraduationCap,
  Home,
  User,
} from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';
import { useTeacher } from '../../context/TeacherContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../design-system';
import { teacherData } from '../../data/dummyData';

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

  const teacher = teacherCtx?.teacher || teacherData;
  const courses = teacher?.courses || [];

  // Persist expanded state
  const [showCourses, setShowCourses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('drawer-show-courses') || 'false');
    } catch { return false; }
  });
  const [expandedCourses, setExpandedCourses] = useState(() => {
    try {
      const saved = localStorage.getItem('drawer-expanded-courses');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem('drawer-show-courses', JSON.stringify(showCourses));
  }, [showCourses]);

  useEffect(() => {
    localStorage.setItem('drawer-expanded-courses', JSON.stringify([...expandedCourses]));
  }, [expandedCourses]);

  const toggleCourse = (courseId) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  // Match desktop sidebar navigation items
  const primaryMenuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard', description: 'Home' },
    { icon: Calendar, label: 'Schedule', path: '/schedule', description: 'View timetable' },
    { icon: ListTodo, label: 'Assessments', path: '/assessments', description: 'Tests & assignments' },
  ];

  // Account items matching desktop
  const secondaryMenuItems = [
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Settings', path: '/settings' },
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
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
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
                  src={teacher.photoURL}
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
              {/* My Classes with Nested Navigation */}
              <div className="p-3">
                <p className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Navigation
                </p>
                
                {/* My Classes - Expandable */}
                <div className="mb-1">
                  <div
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                      ${location.pathname === '/classes' || location.pathname.includes('/course/')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-neutral-700 hover:bg-neutral-50'
                      }
                    `}
                  >
                    <button
                      onClick={() => handleNavigation('/classes')}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div className={`p-2 rounded-lg ${
                        location.pathname === '/classes' || location.pathname.includes('/course/') 
                          ? 'bg-indigo-100' : 'bg-neutral-100'
                      }`}>
                        <GraduationCap className={`w-5 h-5 ${
                          location.pathname === '/classes' || location.pathname.includes('/course/') 
                            ? 'text-indigo-600' : 'text-neutral-500'
                        }`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">My Classes</p>
                        <p className="text-xs text-neutral-500">{courses.length} courses</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setShowCourses(!showCourses)}
                      className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                    >
                      <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showCourses ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Courses List */}
                  <AnimatePresence initial={false}>
                    {showCourses && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-6 mt-1 space-y-1 border-l-2 border-neutral-100 pl-3">
                          {courses.slice(0, 5).map((course) => {
                            const isExpanded = expandedCourses.has(course.id);
                            const isCourseActive = location.pathname === `/course/${course.id}`;
                            
                            return (
                              <div key={course.id}>
                                <div className="flex items-center">
                                  <button
                                    onClick={() => toggleCourse(course.id)}
                                    className="p-1 hover:bg-neutral-100 rounded"
                                  >
                                    {course.sections?.length > 0 ? (
                                      <ChevronRight className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    ) : <div className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => handleNavigation(`/course/${course.id}`)}
                                    className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm ${
                                      isCourseActive ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
                                    }`}
                                  >
                                    <BookOpen className="w-4 h-4" />
                                    <span className="truncate">{course.title}</span>
                                  </button>
                                </div>
                                
                                {/* Sections */}
                                <AnimatePresence initial={false}>
                                  {isExpanded && course.sections?.length > 0 && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="ml-5 space-y-0.5 py-1">
                                        {course.sections.map((section) => {
                                          const isSectionActive = location.pathname === `/course/${course.id}/class/${section.id}`;
                                          return (
                                            <button
                                              key={section.id}
                                              onClick={() => handleNavigation(`/course/${course.id}/class/${section.id}`)}
                                              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left ${
                                                isSectionActive ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-neutral-500 hover:bg-neutral-50'
                                              }`}
                                            >
                                              <Users className="w-3.5 h-3.5" />
                                              Section {section.id}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                          {courses.length > 5 && (
                            <button
                              onClick={() => handleNavigation('/classes')}
                              className="text-xs text-indigo-600 font-medium px-3 py-2"
                            >
                              View all {courses.length} courses →
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Other Navigation Items */}
                <div className="space-y-1">
                  {primaryMenuItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                        ${isActive(item.path)
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-neutral-700 hover:bg-neutral-50'
                        }
                      `}
                    >
                      <div className={`
                        p-2 rounded-lg
                        ${isActive(item.path) ? 'bg-indigo-100' : 'bg-neutral-100'}
                      `}>
                        <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-indigo-600' : 'text-neutral-500'}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-neutral-500">{item.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Navigation */}
              <div className="p-3 border-t border-neutral-100">
                <div className="space-y-0.5">
                  {secondaryMenuItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                        ${isActive(item.path)
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-neutral-600 hover:bg-neutral-50'
                        }
                      `}
                    >
                      <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-indigo-600' : 'text-neutral-400'}`} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Switcher */}
              <div className="p-3 border-t border-neutral-100">
                <p className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Switch Role
                </p>
                <div className="bg-neutral-50 rounded-xl p-2 space-y-1">
                  {roleOptions.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleRoleSwitch(role)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium
                        ${teacherCtx?.persona === role.id
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-neutral-600 hover:bg-white/50'
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
            <div className="border-t border-neutral-100 p-3 bg-neutral-50/50">
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
