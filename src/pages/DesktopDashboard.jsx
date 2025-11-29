import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles, Plus, Bell } from 'lucide-react';
import { useTeacher } from '../context/TeacherContext';
import { 
  getSyllabusByRef, 
  getTeacherTodayActions,
  teacherData,
  students 
} from '../data/dummyData';
import QuickStats from '../components/dashboard/QuickStats';
import QuickActions from '../components/dashboard/QuickActions';
import CourseGrid from '../components/dashboard/CourseGrid';
import AIInsights from '../components/dashboard/AIInsights';
import UpcomingClasses from '../components/dashboard/UpcomingClasses';

/**
 * DesktopDashboard - Desktop-optimized dashboard matching mobile parity
 * 
 * Uses same components as DashboardMobile but with wider layout
 * Key features:
 * - Date selector in schedule section (UpcomingClasses with showDateSelector)
 * - QuickStats, QuickActions, CourseGrid, AIInsights
 * - 2-column layout for better space usage on desktop
 */
export default function DesktopDashboard() {
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleCourseClick = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const handleSectionClick = (courseId, sectionId) => {
    navigate(`/course/${courseId}/class/${sectionId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-6 py-6 rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm">{greeting},</p>
            <h1 className="text-2xl font-bold">{teacher?.name || 'Teacher'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/create')}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium hover:bg-white/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Quick Add
            </button>
          </div>
        </div>

        {/* Today's Overview Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
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

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Main Content */}
        <div className="col-span-8 space-y-6">
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

        {/* Right Column - Schedule & AI */}
        <div className="col-span-4 space-y-6">
          {/* Schedule with Date Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Schedule</h2>
            <UpcomingClasses 
              showDateSelector 
              className="!p-4 !border !border-slate-200 !shadow-sm !bg-white !rounded-2xl" 
            />
          </motion.div>

          {/* Upcoming Classes List */}
          {upcomingClasses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800">Upcoming Classes</h2>
                <span className="text-xs text-slate-500">{upcomingClasses.length} today</span>
              </div>
              <div className="space-y-2">
                {upcomingClasses.slice(0, 4).map((cls, index) => (
                  <motion.button
                    key={cls.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + index * 0.05 }}
                    onClick={() => handleSectionClick(cls.courseId, cls.sectionId)}
                    className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <div className="w-1 h-10 rounded-full bg-indigo-500" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-slate-800">{cls.courseName}</p>
                      <p className="text-xs text-slate-500">{cls.time} • Section {cls.section}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* AI Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <AIInsights />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
