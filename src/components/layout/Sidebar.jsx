import React, { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  FileText,
  Users,
  BarChart3,
  FolderOpen,
  ChevronLeft,
  Menu,
  User,
  Settings,
  GraduationCap,
  Calendar,
  MessageSquare,
  Building2,
  Shield,
} from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';
import { useTeacher } from '../../context/TeacherContext';

/**
 * Desktop Sidebar Navigation
 * Role-based filtering with collapsible sections
 * 
 * Navigation Structure:
 * - Teacher: Dashboard, My Classes, Schedule | Assessments, Resources | Profile, Settings
 * - HOD: Same + Department Overview
 * - Admin: Separate admin routes
 */
export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const persona = teacherCtx?.persona || 'teacher';

  // Role-based navigation items
  const navConfig = useMemo(() => {
    const teacherNav = [
      { path: '/dashboard', icon: Home, label: 'Dashboard' },
      { path: '/classes', icon: GraduationCap, label: 'My Classes' },
      { path: '/schedule', icon: Calendar, label: 'Schedule' },
    ];

    const toolsNav = [
      { path: '/assessments', icon: FileText, label: 'Assessments' },
      { path: '/resources', icon: FolderOpen, label: 'Resources' },
    ];

    const accountNav = [
      { path: '/profile', icon: User, label: 'Profile' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ];

    // HOD-specific nav items
    const hodNav = [
      { path: '/hod-dashboard', icon: Building2, label: 'Department' },
    ];

    // Admin-specific nav items
    const adminNav = [
      { path: '/admin-dashboard', icon: Shield, label: 'Admin Panel' },
    ];

    // Build sections based on persona
    const sections = [
      { title: null, items: teacherNav },
      { title: 'Tools', items: toolsNav },
    ];

    // Add role-specific section if applicable
    if (persona === 'hod') {
      sections.push({ title: 'Department', items: hodNav });
    } else if (persona === 'admin') {
      sections.push({ title: 'Administration', items: adminNav });
    }

    sections.push({ title: 'Account', items: accountNav });

    return sections;
  }, [persona]);

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.path || 
                     (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
    const Icon = item.icon;

    return (
      <NavLink
        to={item.path}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-xl ml-1
          transition-all duration-200 group
          ${isActive
            ? 'bg-indigo-50 text-indigo-700 font-medium'
            : 'text-black-600 hover:bg-black-50 hover:text-black-800'
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
        
        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-black-400 group-hover:text-black-600'}`} />
        
        {!sidebarCollapsed && (
          <span className="text-sm truncate">
            {item.label}
          </span>
        )}

        {/* Tooltip for collapsed state */}
        {sidebarCollapsed && (
          <div className="
            absolute left-full ml-2 px-2 py-1 
            bg-black-800 text-white text-xs rounded-md
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
        <p className="px-3 py-2 text-xs font-semibold text-black-400 uppercase tracking-wider">
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
        bg-white border-r border-black-200
        flex flex-col
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-16' : 'w-60'}
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
        <div className="px-3 py-3 border-t border-black-100">
          <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
            persona === 'hod' 
              ? 'bg-purple-50 text-purple-700' 
              : 'bg-amber-50 text-amber-700'
          }`}>
            Viewing as {persona === 'hod' ? 'Head of Dept' : 'Admin'}
          </div>
        </div>
      )}
    </aside>
  );
}
