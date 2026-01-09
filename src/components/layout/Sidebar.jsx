import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  User,
  Settings,
  GraduationCap,
  Calendar,
  Building2,
  Shield,
  FileText,
  ChevronDown,
  ChevronRight,
  Users,
  BookOpen,
} from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';
import { useTeacher } from '../../context/TeacherContext';
import { teacherData } from '../../data/dummyData';

/**
 * Desktop Sidebar Navigation
 * Role-based filtering with collapsible sections & nested course navigation
 * 
 * Navigation Structure:
 * - Teacher: Dashboard, My Classes (expandable with courses/sections), Schedule, Assessments | Profile, Settings
 * - HOD: Same + Department Overview
 * - Admin: Separate admin routes
 */
export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const persona = teacherCtx?.persona || 'teacher';
  const teacher = teacherCtx?.teacher || teacherData;
  const courses = teacher?.courses || [];

  // Persist expanded state in localStorage to prevent reset on navigation
  const [expandedCourses, setExpandedCourses] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-expanded-courses');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  
  const [showAllCourses, setShowAllCourses] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-show-courses');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('sidebar-expanded-courses', JSON.stringify([...expandedCourses]));
  }, [expandedCourses]);

  useEffect(() => {
    localStorage.setItem('sidebar-show-courses', JSON.stringify(showAllCourses));
  }, [showAllCourses]);

  // Auto-expand when on a course/class page
  useEffect(() => {
    if (location.pathname.includes('/course/')) {
      setShowAllCourses(true);
      // Extract course ID and auto-expand it
      const match = location.pathname.match(/\/course\/([^/]+)/);
      if (match) {
        setExpandedCourses(prev => new Set([...prev, match[1]]));
      }
    }
  }, [location.pathname]);

  const toggleCourse = (e, courseId) => {
    e.stopPropagation();
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const toggleShowCourses = (e) => {
    e.stopPropagation();
    setShowAllCourses(!showAllCourses);
  };

  // Role-based navigation items
  const navConfig = useMemo(() => {
    // Core teacher navigation
    const mainNav = [
      { path: '/dashboard', icon: Home, label: 'Dashboard' },
      { path: '/classes', icon: GraduationCap, label: 'My Classes', expandable: true },
      { path: '/schedule', icon: Calendar, label: 'Schedule' },
      { path: '/assessments', icon: FileText, label: 'Assessments' },
    ];

    const accountNav = [
      { path: '/profile', icon: User, label: 'Profile' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ];

    // Build sections based on persona
    const sections = [
      { title: null, items: mainNav },
    ];

    // Add role-specific section only if applicable
    if (persona === 'hod') {
      sections.push({ 
        title: 'Department', 
        items: [{ path: '/hod-dashboard', icon: Building2, label: 'Department' }] 
      });
    } else if (persona === 'admin') {
      sections.push({ 
        title: 'Admin', 
        items: [{ path: '/admin-dashboard', icon: Shield, label: 'Admin Panel' }] 
      });
    }

    sections.push({ title: null, items: accountNav });

    return sections;
  }, [persona]);

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.path || 
                     (item.path !== '/dashboard' && item.path !== '/classes' && location.pathname.startsWith(item.path));
    const isClassesNav = item.path === '/classes';
    const Icon = item.icon;

    // Check if we're on a course or class page
    const isOnCoursePage = location.pathname.includes('/course/');
    const isClassesActive = location.pathname === '/classes' || isOnCoursePage;

    if (isClassesNav && !sidebarCollapsed && item.expandable) {
      return (
        <div className="space-y-1">
          {/* My Classes header - click navigates, dropdown toggles expand */}
          <div
            className={`
              relative flex items-center gap-3 px-3 py-2.5 rounded-xl ml-1
              transition-all duration-200 group
              ${isClassesActive
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
              }
            `}
          >
            {isClassesActive && (
              <div
                className="absolute -left-1 top-1 bottom-1 w-1 bg-indigo-600 rounded-full"
                style={{ boxShadow: '0 0 8px rgba(99,102,241,0.5)' }}
              />
            )}
            
            {/* Main clickable area - navigates to /classes */}
            <button
              onClick={() => navigate('/classes')}
              className="flex items-center gap-3 flex-1 text-left"
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isClassesActive ? 'text-indigo-600' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
              <span className="text-sm truncate">{item.label}</span>
            </button>
            
            {/* Dropdown toggle button - separate from navigation */}
            <button
              onClick={toggleShowCourses}
              className="p-1 hover:bg-neutral-200 rounded transition-colors"
              title={showAllCourses ? 'Collapse courses' : 'Expand courses'}
            >
              <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showAllCourses ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Expandable Courses List */}
          <AnimatePresence initial={false}>
            {showAllCourses && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden ml-4"
              >
                <div className="space-y-0.5 py-1 border-l border-neutral-200 ml-2">
                  {courses.slice(0, 6).map((course) => {
                    const isExpanded = expandedCourses.has(course.id);
                    const isCourseActive = location.pathname === `/course/${course.id}`;
                    const isAnySectionActive = course.sections?.some(
                      s => location.pathname === `/course/${course.id}/class/${s.id}`
                    );

                    return (
                      <div key={course.id}>
                        {/* Course Row */}
                        <div className="flex items-center">
                          <button
                            onClick={(e) => toggleCourse(e, course.id)}
                            className="p-1 hover:bg-neutral-100 rounded ml-1"
                            title={isExpanded ? 'Collapse sections' : 'Expand sections'}
                          >
                            {course.sections?.length > 0 ? (
                              <ChevronRight 
                                className={`w-3 h-3 text-neutral-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                              />
                            ) : (
                              <div className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => navigate(`/course/${course.id}`)}
                            className={`
                              flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-left
                              transition-colors text-xs
                              ${isCourseActive 
                                ? 'bg-indigo-100 text-indigo-700 font-medium' 
                                : isAnySectionActive
                                  ? 'text-indigo-600'
                                  : 'text-neutral-600 hover:bg-neutral-50'
                              }
                            `}
                          >
                            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{course.title.length > 15 ? course.title.substring(0, 15) + '...' : course.title}</span>
                          </button>
                        </div>

                        {/* Sections under each course */}
                        <AnimatePresence initial={false}>
                          {isExpanded && course.sections?.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-6 space-y-0.5 py-0.5">
                                {course.sections.map((section) => {
                                  const isSectionActive = location.pathname === `/course/${course.id}/class/${section.id}`;
                                  return (
                                    <button
                                      key={section.id}
                                      onClick={() => navigate(`/course/${course.id}/class/${section.id}`)}
                                      className={`
                                        w-full flex items-center gap-2 px-2 py-1 rounded text-left
                                        transition-colors text-xs
                                        ${isSectionActive 
                                          ? 'bg-indigo-100 text-indigo-700 font-medium' 
                                          : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
                                        }
                                      `}
                                    >
                                      <Users className="w-3 h-3" />
                                      <span>Section {section.id}</span>
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

                  {/* View All link if more courses */}
                  {courses.length > 6 && (
                    <button
                      onClick={() => navigate('/classes')}
                      className="w-full text-left px-4 py-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      View all {courses.length} courses →
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <NavLink
        to={item.path}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-xl ml-1
          transition-all duration-200 group
          ${isActive
            ? 'bg-indigo-50 text-indigo-700 font-medium'
            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
          }
        `}
      >
        {/* Active indicator - visible bar on left */}
        {isActive && (
          <div
            className="absolute -left-1 top-1 bottom-1 w-1 bg-indigo-600 rounded-full"
            style={{ boxShadow: '0 0 8px rgba(99,102,241,0.5)' }}
          />
        )}
        
        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
        
        {!sidebarCollapsed && (
          <span className="text-sm truncate">
            {item.label}
          </span>
        )}

        {/* Tooltip for collapsed state */}
        {sidebarCollapsed && (
          <div className="
            absolute left-full ml-2 px-2 py-1 
            bg-neutral-800 text-white text-xs rounded-md
            opacity-0 group-hover:opacity-100 transition-opacity
            pointer-events-none whitespace-nowrap z-50
          ">
            {item.label}
          </div>
        )}
      </NavLink>
    );
  };

  const NavSection = ({ title, items }) => (
    <div className="space-y-1">
      {!sidebarCollapsed && title && (
        <p className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavItem key={item.path} item={item} />
      ))}
    </div>
  );

  return (
    <aside
      className={`
        fixed top-16 left-0 bottom-0 z-30
        bg-white border-r border-neutral-200
        flex flex-col
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {navConfig.map((section, idx) => (
          <NavSection key={idx} title={section.title} items={section.items} />
        ))}
      </div>

      {/* Persona indicator at bottom */}
      {!sidebarCollapsed && persona !== 'teacher' && (
        <div className="px-3 py-3 border-t border-neutral-100">
          <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
            persona === 'hod' 
              ? 'bg-purple-50 text-purple-700' 
              : 'bg-yellow-50 text-yellow-700'
          }`}>
            Viewing as {persona === 'hod' ? 'Head of Dept' : 'Admin'}
          </div>
        </div>
      )}
    </aside>
  );
}
