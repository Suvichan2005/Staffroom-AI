import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Users, BookOpen, ChevronRight, Mic, 
  Calendar, Sparkles, Play, ArrowRight, Settings,
  MapPin, ChevronLeft, ChevronDown, Layers
} from "lucide-react";
import { useTeacher } from "../context/TeacherContext";
import { PageShell } from "../components/layout";
import { NoticesPanel } from "../components/dashboard";
import { SplashOnboarding, useSplashOnboarding } from "../components/shared";
import { ScrollContainer } from "../components/shared/ScrollableList";
import { 
  getSyllabusByRef, 
  getTeacherTodayActions, 
  teacherData,
  getUpcomingSessions,
  normalizeSectionProgress,
  loadStoredProgress,
  calculateTopicProgressPercent
} from "../data/dummyData";

/**
 * Dashboard - Redesigned "Today View"
 * Clean, action-focused layout with schedule-inspired today's classes
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const courses = teacher?.courses || [];
  const { reset: resetOnboarding, isComplete } = useSplashOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  
  const showSetupStrip = isComplete;
  const todayActions = useMemo(() => getTeacherTodayActions(teacher), [teacher]);
  
  // Get current view date
  const currentViewDate = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + dayOffset);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [dayOffset]);

  // Get sessions for the current view date
  const todaySessions = useMemo(() => {
    return getUpcomingSessions(teacher, 30).filter(
      sess => sess.date === currentViewDate
    ).slice(0, 12);
  }, [teacher, currentViewDate]);

  // Find the next upcoming or current class
  const nextClass = useMemo(() => {
    if (dayOffset !== 0 || todaySessions.length === 0) return null;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    for (const session of todaySessions) {
      const [sh, sm] = session.startTime.split(':').map(Number);
      const [eh, em] = session.endTime.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      
      if (currentTime >= startMins - 15 && currentTime <= endMins) {
        return { ...session, status: currentTime < startMins ? 'upcoming' : 'active' };
      }
      if (currentTime < startMins) {
        return { ...session, status: 'next' };
      }
    }
    return todaySessions[0] ? { ...todaySessions[0], status: 'later' } : null;
  }, [todaySessions, dayOffset]);

  // Sections needing attendance
  const sectionsNeedingAttendance = useMemo(() => {
    const sections = [];
    courses.forEach(course => {
      course.sections?.forEach(section => {
        const hasClassToday = todaySessions.some(
          s => s.courseId === course.id && s.classId === section.id
        );
        if (hasClassToday) {
          sections.push({
            courseId: course.id,
            sectionId: section.id,
            courseName: course.title,
            section: section.id,
          });
        }
      });
    });
    return sections.slice(0, 3);
  }, [courses, todaySessions]);

  // Quick stats
  const quickStats = useMemo(() => [
    {
      label: "Classes Today",
      value: todaySessions.length,
      icon: Calendar,
      color: "indigo",
      action: () => navigate("/schedule"),
    },
    {
      label: "Attendance Pending",
      value: todayActions.pendingAttendance,
      icon: Users,
      color: todayActions.pendingAttendance > 0 ? "green" : "indigo",
      action: sectionsNeedingAttendance[0] 
        ? () => navigate(`/course/${sectionsNeedingAttendance[0].courseId}/class/${sectionsNeedingAttendance[0].sectionId}?tab=attendance`)
        : null,
      urgent: todayActions.pendingAttendance > 0,
    },
    {
      label: "Assignments Due",
      value: todayActions.assignmentsDue,
      icon: BookOpen,
      color: todayActions.assignmentsDue > 0 ? "amber" : "indigo",
      action: () => navigate("/assessments"),
    },
  ], [todaySessions, todayActions, sectionsNeedingAttendance, navigate]);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Format date label
  const formatDateLabel = () => {
    if (dayOffset === 0) return 'Today';
    if (dayOffset === 1) return 'Tomorrow';
    if (dayOffset === -1) return 'Yesterday';
    const [year, month, day] = currentViewDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Get color for class based on subject
  const getClassColors = (courseId) => {
    const colors = {
      geo: { bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'bg-indigo-500', text: 'text-indigo-700' },
      hist: { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'bg-purple-500', text: 'text-purple-700' },
      default: { bg: 'bg-violet-50', border: 'border-violet-200', accent: 'bg-violet-500', text: 'text-violet-700' },
    };
    const key = courseId?.includes('geo') ? 'geo' : courseId?.includes('hist') ? 'hist' : 'default';
    return colors[key];
  };

  // Check if class is active
  const isClassActive = (session) => {
    if (dayOffset !== 0) return false;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = session.startTime.split(':').map(Number);
    const [eh, em] = session.endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    return currentTime >= startMins && currentTime <= endMins;
  };

  return (
    <PageShell width="5xl">
      {/* Setup Strip - Gradient border only */}
      {showSetupStrip && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-[2px] rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500"
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-[10px] bg-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                <Settings className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-neutral-700">
                Complete your setup to unlock all features
              </p>
            </div>
            <button
              onClick={() => {
                resetOnboarding();
                setShowOnboarding(true);
              }}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-colors"
            >
              Complete Setup
            </button>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800">
          {greeting}, {teacher?.name?.split(' ')[0] || 'Teacher'}
        </h1>
        <p className="text-neutral-500 mt-1">
          {todaySessions.length > 0 
            ? `You have ${todaySessions.length} class${todaySessions.length > 1 ? 'es' : ''} ${dayOffset === 0 ? 'today' : formatDateLabel()}`
            : `No classes scheduled ${dayOffset === 0 ? 'for today' : formatDateLabel()}`
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Next Class Card - Only show for today if there's an upcoming/active class */}
          {nextClass && dayOffset === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-2xl p-5 ${
                nextClass.status === 'active' 
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-400' 
                  : 'bg-gradient-to-br from-indigo-600 to-purple-700'
              } text-white`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {nextClass.status === 'active' ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        In Progress
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium">
                        {nextClass.status === 'upcoming' ? 'Starting Soon' : 'Next Up'}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold mb-1">{nextClass.subject}</h2>
                  <p className="text-white/80 text-sm">Section {nextClass.classId}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-white/90">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {nextClass.startTime} - {nextClass.endTime}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/course/${nextClass.courseId}/class/${nextClass.classId}`)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Go to Class
                </button>
              </div>
              
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/20">
                <button
                  onClick={() => navigate(`/course/${nextClass.courseId}/class/${nextClass.classId}?tab=attendance`)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
                >
                  <Mic className="w-3.5 h-3.5" />
                  Take Attendance
                </button>
                <button
                  onClick={() => navigate(`/course/${nextClass.courseId}/class/${nextClass.classId}?tab=syllabus`)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Update Syllabus
                </button>
              </div>
            </motion.div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            {quickStats.map((stat, idx) => {
              const Icon = stat.icon;
              const colorMap = {
                indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-600' },
                amber: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', text: 'text-yellow-600' },
                green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', text: 'text-green-600' },
              };
              const colors = colorMap[stat.color];
              
              return (
                <motion.button
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={stat.action}
                  disabled={!stat.action}
                  className={`relative p-4 ${colors.bg} rounded-xl transition-all text-left ${
                    stat.action ? 'hover:shadow-md cursor-pointer' : 'cursor-default'
                  } ${stat.urgent ? 'ring-2 ring-yellow-300' : ''}`}
                >
                  <div className={`inline-flex p-2 rounded-lg mb-2 ${colors.icon.split(' ')[0]}`}>
                    <Icon className={`w-4 h-4 ${colors.icon.split(' ')[1]}`} />
                  </div>
                  <p className="text-2xl font-bold text-neutral-800">{stat.value}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{stat.label}</p>
                  {stat.action && (
                    <ChevronRight className="absolute top-4 right-3 w-4 h-4 text-neutral-300" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* My Classes - Clean Card Grid */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-800">My Courses & Classes</h3>
              <button 
                onClick={() => navigate("/classes")}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            
            {/* Course Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courses.slice(0, 4).map((course, idx) => {
                const syllabus = getSyllabusByRef(course.syllabusRef);
                const totalSections = course.sections?.length || 0;
                
                // Calculate average progress
                let avgProgress = 0;
                if (syllabus && course.sections) {
                  const progressSum = course.sections.reduce((sum, section) => {
                    const baseProgress = normalizeSectionProgress(syllabus, section.progress);
                    const storedProgress = loadStoredProgress(section.id, baseProgress);
                    return sum + calculateTopicProgressPercent(syllabus, storedProgress);
                  }, 0);
                  avgProgress = Math.round(progressSum / Math.max(course.sections.length, 1));
                }

                // Color variants for cards
                const cardColors = [
                  { bg: 'from-indigo-500 to-purple-600', light: 'bg-indigo-50' },
                  { bg: 'from-purple-500 to-pink-600', light: 'bg-purple-50' },
                  { bg: 'from-blue-500 to-cyan-600', light: 'bg-blue-50' },
                  { bg: 'from-violet-500 to-indigo-600', light: 'bg-violet-50' },
                ];
                const colorSet = cardColors[idx % cardColors.length];
                
                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer"
                    onClick={() => navigate(`/course/${course.id}`)}
                  >
                    {/* Card Header with gradient */}
                    <div className={`h-2 bg-gradient-to-r ${colorSet.bg}`} />
                    
                    <div className="p-4">
                      {/* Course Title */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorSet.bg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
                          {course.title.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-neutral-800 truncate group-hover:text-indigo-700 transition-colors">
                            {course.title}
                          </h4>
                          <p className="text-xs text-neutral-500">{totalSections} section{totalSections !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-neutral-500">Progress</span>
                          <span className="font-medium text-neutral-700">{avgProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${colorSet.bg} rounded-full transition-all`}
                            style={{ width: `${avgProgress}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Quick Section Links */}
                      {course.sections?.slice(0, 2).map((section) => (
                        <button
                          key={section.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/course/${course.id}/class/${section.id}`);
                          }}
                          className={`w-full flex items-center justify-between p-2 ${colorSet.light} rounded-lg text-xs mb-1.5 last:mb-0 hover:ring-1 hover:ring-indigo-200 transition-all`}
                        >
                          <span className="flex items-center gap-2 text-neutral-700">
                            <Users className="w-3 h-3" />
                            Section {section.id}
                          </span>
                          <ChevronRight className="w-3 h-3 text-neutral-400" />
                        </button>
                      ))}
                      
                      {/* Show more sections indicator */}
                      {course.sections?.length > 2 && (
                        <p className="text-[10px] text-neutral-400 text-center mt-2">
                          +{course.sections.length - 2} more section{course.sections.length - 2 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Show more courses link */}
            {courses.length > 4 && (
              <button
                onClick={() => navigate('/classes')}
                className="w-full mt-3 py-2 text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium border border-dashed border-neutral-200 rounded-lg hover:border-indigo-300 transition-colors"
              >
                View all {courses.length} courses →
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Today's Classes - Schedule-inspired */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Day Navigation Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <button 
                onClick={() => setDayOffset(d => d - 1)}
                className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-neutral-500" />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold text-neutral-800">{formatDateLabel()}</p>
                <p className="text-xs text-neutral-400">
                  {todaySessions.length} class{todaySessions.length !== 1 ? 'es' : ''}
                </p>
              </div>
              <button 
                onClick={() => setDayOffset(d => d + 1)}
                className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            {/* Classes List */}
            <ScrollContainer maxHeight="320px">
              <div className="p-3 space-y-2">
                {todaySessions.length > 0 ? (
                  todaySessions.map((session, idx) => {
                    const colors = getClassColors(session.courseId);
                    const isActive = isClassActive(session);
                    
                    return (
                      <motion.button
                        key={`${session.courseId}-${session.classId}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => navigate(`/course/${session.courseId}/class/${session.classId}`)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl ${colors.bg} border ${colors.border} hover:shadow-md transition-all text-left group ${
                          isActive ? 'ring-2 ring-indigo-400' : ''
                        }`}
                      >
                        {/* Time */}
                        <div className="flex flex-col items-center min-w-[44px]">
                          <span className={`text-sm font-bold ${colors.text}`}>{session.startTime}</span>
                          <span className="text-[10px] text-neutral-400">{session.endTime}</span>
                        </div>
                        
                        {/* Accent bar */}
                        <div className={`w-1 self-stretch rounded-full ${colors.accent} ${isActive ? 'animate-pulse' : ''}`} />
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-neutral-800 text-sm truncate">
                            {session.subject?.replace('Grade ', '')}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                            <span className="flex items-center gap-0.5">
                              <Users className="w-3 h-3" />
                              {session.classId}
                            </span>
                          </div>
                        </div>

                        {/* Active indicator or arrow */}
                        {isActive ? (
                          <span className="px-2 py-1 bg-indigo-500 text-white text-[10px] font-medium rounded-full">
                            NOW
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500" />
                        )}
                      </motion.button>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto bg-neutral-100 rounded-xl flex items-center justify-center mb-3">
                      <Calendar className="w-6 h-6 text-neutral-400" />
                    </div>
                    <p className="text-sm text-neutral-500">No classes scheduled</p>
                    <p className="text-xs text-neutral-400 mt-1">Enjoy your free time!</p>
                  </div>
                )}
              </div>
            </ScrollContainer>

            {/* View Full Schedule Link */}
            <div className="p-3 border-t border-neutral-100">
              <button
                onClick={() => navigate("/schedule")}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View Full Schedule
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Notices */}
          <NoticesPanel />
        </div>
      </div>

      {/* Onboarding Wizard */}
      <SplashOnboarding 
        forceShow={showOnboarding} 
        onComplete={() => setShowOnboarding(false)} 
      />
    </PageShell>
  );
}
