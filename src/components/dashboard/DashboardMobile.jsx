import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import QuickStats from './QuickStats';
import QuickActions from './QuickActions';
import CourseGrid from './CourseGrid';
import AIInsights from './AIInsights';
import UpcomingClasses from './UpcomingClasses';
import { useTeacher } from '../../context/TeacherContext';
import { 
  teacherData, 
  getSyllabusByRef, 
  getTeacherTodayActions,
  students 
} from '../../data/dummyData';

/**
 * Dashboard - Unified responsive dashboard for mobile and desktop
 * Single component that adapts to all screen sizes
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const courses = teacher?.courses || [];

  // Compute stats from real data
  const todayActions = useMemo(() => getTeacherTodayActions(teacher), [teacher]);
  
  const stats = useMemo(() => ({
    pendingAttendance: todayActions.pendingAttendance,
    chaptersLeft: todayActions.chaptersLeft,
    assignmentsDue: todayActions.assignmentsDue,
    totalStudents: students.length,
  }), [todayActions]);

  // Build syllabus map for CourseGrid
  const syllabusMap = useMemo(() => {
    const map = {};
    courses.forEach(course => {
      map[course.syllabusRef] = getSyllabusByRef(course.syllabusRef);
    });
    return map;
  }, [courses]);

  // Get upcoming classes for today
  const upcomingClasses = useMemo(() => {
    const classes = [];
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = dayNames[now.getDay()];

    courses.forEach(course => {
      course.sections?.forEach(section => {
        const schedules = section.schedules || (section.schedule ? [section.schedule] : []);
        schedules.forEach(schedule => {
          if (schedule.startsWith(today)) {
            const timeMatch = schedule.match(/(\d{1,2}:\d{2})/);
            classes.push({
              id: `${course.id}-${section.id}`,
              courseId: course.id,
              sectionId: section.id,
              courseName: course.title,
              section: section.id,
              time: timeMatch ? timeMatch[1] : 'TBD',
              schedule,
            });
          }
        });
      });
    });

    return classes.sort((a, b) => a.time.localeCompare(b.time));
  }, [courses]);

  const handleCourseClick = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const handleSectionClick = (courseId, sectionId) => {
    navigate(`/course/${courseId}/class/${sectionId}`);
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-4 md:px-6 pt-6 pb-8 md:rounded-3xl md:mx-2 md:mt-0 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm">{greeting},</p>
            <h1 className="text-xl md:text-2xl font-bold">{teacher?.name || 'Teacher'}</h1>
          </div>
        </div>

        {/* Today's Overview Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-3xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-sm font-medium">Today's Overview</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{upcomingClasses.length} Classes</span>
            <span className="text-indigo-200">|</span>
            <span>{stats.pendingAttendance} Pending</span>
            <span className="text-indigo-200">|</span>
            <span>{stats.assignmentsDue} Tasks</span>
          </div>
        </motion.div>
      </div>

      {/* Content - Responsive Grid Layout */}
      <div className="px-4 md:px-6 -mt-4 space-y-6">
        {/* Desktop: Two-column layout, Mobile: Single column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <QuickStats stats={stats} />
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Quick Actions</h2>
              <QuickActions />
            </motion.div>

            {/* Courses */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800">My Courses</h2>
                <button 
                  onClick={() => navigate('/classes')}
                  className="text-xs text-indigo-600 font-medium hover:underline"
                >
                  View All
                </button>
              </div>
              <CourseGrid 
                courses={courses} 
                syllabusMap={syllabusMap}
                onCourseClick={handleCourseClick}
                onSectionClick={handleSectionClick}
              />
            </motion.div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Today's Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <h2 className="text-sm font-semibold text-slate-800 mb-3 md:hidden">Schedule</h2>
              <UpcomingClasses showDateSelector className="!p-3 md:!p-4 !border !border-slate-200 !shadow-sm !bg-white !rounded-2xl" />
            </motion.div>


            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <AIInsights />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
