import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Users, BookOpen, ClipboardCheck, Bell,
  ChevronRight, Clock, AlertTriangle, CheckCircle2,
  TrendingUp, Sparkles, Plus, Search, BarChart2, FileText
} from 'lucide-react';
import { useTeacher } from '../context/TeacherContext';
import { 
  getSyllabusByRef, 
  getTeacherTodayActions, 
  getTeacherAnalyticsSnapshot,
  teacherData 
} from '../data/dummyData';

// Import teacher components
import { QuickActionsGrid, QuickActionChip } from '../components/teacher/QuickActionTile';
import { ClassCardCompact } from '../components/teacher/ClassCard';
import { SkeletonCard } from '../components/design-system/Skeleton';

/**
 * MobileDashboard - Optimized mobile experience for teachers
 * 
 * Features:
 * - Greeting with time-aware message
 * - Quick stats bar
 * - Quick actions grid (top 5 teacher actions)
 * - Today's classes
 * - AI insights card
 * - Recent notifications
 */
export default function MobileDashboard() {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const [activeFilter, setActiveFilter] = useState('all');
  
  const todayActions = useMemo(() => getTeacherTodayActions(teacher), [teacher]);
  const analytics = useMemo(() => getTeacherAnalyticsSnapshot(teacher), [teacher]);
  
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Quick actions - top 5 teacher needs
  const quickActions = [
    { id: 'attendance', icon: ClipboardCheck, label: 'Mark Attendance', color: 'from-indigo-500 to-blue-500', badge: todayActions.pendingAttendance, path: '/attendance' },
    { id: 'schedule', icon: Calendar, label: 'Today\'s Classes', color: 'from-purple-500 to-pink-500', path: '/schedule' },
    { id: 'students', icon: Users, label: 'Students', color: 'from-green-500 to-teal-500', path: '/students' },
    { id: 'resources', icon: BookOpen, label: 'Resources', color: 'from-orange-500 to-yellow-500', path: '/resources' },
    { id: 'tasks', icon: FileText, label: 'Tasks', color: 'from-red-500 to-red-500', badge: todayActions.assignmentsDue, path: '/tasks' },
  ];

  // Today's classes (mock data based on teacher courses)
  const todaysClasses = teacher?.courses?.slice(0, 3).map((course, i) => ({
    id: course.id,
    subject: course.name,
    section: course.sections?.[0]?.name || '6A',
    time: ['9:00 AM', '11:30 AM', '2:00 PM'][i],
    room: ['Room 201', 'Lab 3', 'Room 105'][i],
    status: i === 0 ? 'upcoming' : i === 1 ? 'now' : 'later',
    attendanceStatus: i === 0 ? 'pending' : 'done',
    students: 32 + i * 3,
  })) || [];

  // AI insights
  const aiInsights = [
    { type: 'alert', message: '3 students below 75% attendance in 8A', action: 'View' },
    { type: 'suggestion', message: 'Quiz ready for Chapter 3 - schedule for Friday', action: 'Schedule' },
    { type: 'info', message: 'New climate article matches your 6C syllabus', action: 'Share' },
  ];

  // Filter chips
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'classes', label: 'Classes' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'alerts', label: 'Alerts' },
  ];

  return (
    <div className="min-h-screen bg-black-50 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-4 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-indigo-200 text-sm"
            >
              {greeting}
            </motion.p>
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-xl font-bold text-white"
            >
              {teacher?.name?.split(' ')[0] || 'Teacher'} 👋
            </motion.h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/search')}
              className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl"
            >
              <Search className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/notifications')}
              className="relative p-2.5 bg-white/10 backdrop-blur-sm rounded-xl"
            >
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </motion.button>
          </div>
        </div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <StatBadge
            icon={ClipboardCheck}
            label="Pending"
            value={todayActions.pendingAttendance}
            color="bg-white/15"
          />
          <StatBadge
            icon={BookOpen}
            label="Chapters"
            value={todayActions.chaptersLeft}
            color="bg-white/15"
          />
          <StatBadge
            icon={TrendingUp}
            label="Progress"
            value={`${analytics.overallProgress}%`}
            color="bg-white/15"
          />
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-black-800">Quick Actions</h2>
            <button className="text-xs text-indigo-600 font-medium">Customize</button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {quickActions.map((action, index) => (
              <QuickActionItem
                key={action.id}
                action={action}
                delay={0.2 + index * 0.05}
                onClick={() => navigate(action.path)}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 mt-5">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filters.map((filter) => (
            <motion.button
              key={filter.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter(filter.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${activeFilter === filter.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-black-600 border border-black-200'
                }
              `}
            >
              {filter.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Today's Classes */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-black-800">Today's Classes</h2>
          <button 
            onClick={() => navigate('/schedule')}
            className="text-sm text-indigo-600 font-medium flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {todaysClasses.map((cls, index) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + index * 0.1 }}
            >
              <ClassItem 
                classData={cls} 
                onClick={() => navigate(`/course/${cls.id}`)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-black-800">AI Insights</h2>
          </div>
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs font-medium rounded-full">
            Beta
          </span>
        </div>
        <div className="space-y-2">
          {aiInsights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <InsightCard insight={insight} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAB for quick add */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, delay: 0.6 }}
        onClick={() => navigate('/create')}
        className="fixed right-4 bottom-36 w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center z-30"
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>
    </div>
  );
}

// Stat Badge Component
function StatBadge({ icon: Icon, label, value, color }) {
  return (
    <div className={`${color} backdrop-blur-sm rounded-xl p-3 text-center`}>
      <Icon className="w-5 h-5 text-white/80 mx-auto mb-1" />
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-white/70">{label}</p>
    </div>
  );
}

// Quick Action Item Component
function QuickActionItem({ action, delay, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5"
    >
      <div className={`relative w-12 h-12 bg-gradient-to-br ${action.color} rounded-2xl flex items-center justify-center shadow-md`}>
        <action.icon className="w-5 h-5 text-white" />
        {action.badge > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
            {action.badge}
          </span>
        )}
      </div>
      <span className="text-[10px] text-black-600 font-medium text-center leading-tight">
        {action.label.split(' ').slice(0, 2).join(' ')}
      </span>
    </motion.button>
  );
}

// Class Item Component
function ClassItem({ classData, onClick }) {
  const isNow = classData.status === 'now';
  const isPending = classData.attendanceStatus === 'pending';

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-2xl border transition-all
        ${isNow 
          ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
          : 'bg-white border-black-200 hover:border-indigo-200'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Time indicator */}
        <div className={`
          flex-shrink-0 w-14 text-center
          ${isNow ? 'text-indigo-600' : 'text-black-500'}
        `}>
          <p className="text-sm font-semibold">{classData.time.split(' ')[0]}</p>
          <p className="text-xs">{classData.time.split(' ')[1]}</p>
        </div>

        {/* Divider */}
        <div className={`w-0.5 h-12 rounded-full ${isNow ? 'bg-indigo-400' : 'bg-black-200'}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-black-800 truncate">{classData.subject}</h3>
            {isNow && (
              <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                NOW
              </span>
            )}
          </div>
          <p className="text-sm text-black-500 mt-0.5">
            {classData.section} • {classData.room} • {classData.students} students
          </p>
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0">
          {isPending ? (
            <div className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Pending</span>
            </div>
          ) : (
            <div className="p-1.5 bg-green-100 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// Insight Card Component
function InsightCard({ insight }) {
  const getIcon = () => {
    switch (insight.type) {
      case 'alert': return AlertTriangle;
      case 'suggestion': return Sparkles;
      default: return Bell;
    }
  };

  const getColors = () => {
    switch (insight.type) {
      case 'alert': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'suggestion': return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      default: return 'bg-black-50 border-black-200 text-black-700';
    }
  };

  const Icon = getIcon();

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${getColors()}`}>
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4" />
      </div>
      <p className="flex-1 text-sm">{insight.message}</p>
      <button className="flex-shrink-0 px-3 py-1 bg-white rounded-lg text-xs font-medium shadow-sm border border-current/20 hover:bg-black-50 transition-colors">
        {insight.action}
      </button>
    </div>
  );
}
