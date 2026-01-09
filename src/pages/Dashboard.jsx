import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Clock, Users, BookOpen, ChevronRight, Mic, 
  CheckCircle2, AlertCircle, Calendar, Sparkles,
  Play, ArrowRight, Bell, RotateCcw, FolderPlus, Settings
} from "lucide-react";
import { useTeacher } from "../context/TeacherContext";
import { PageShell } from "../components/layout";
import { UpcomingClasses, NoticesPanel } from "../components/dashboard";
import { SplashOnboarding, useSplashOnboarding } from "../components/shared";
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
 * Dashboard - "Today View"
 * 
 * Redesigned to prioritize actions over analytics.
 * Teachers should know within 5 seconds:
 * 1. What's my next class?
 * 2. What needs my attention?
 * 3. How do I take action?
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const courses = teacher?.courses || [];
  const { reset: resetOnboarding, isComplete } = useSplashOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Strip shows only when onboarding is NOT complete
  const showSetupStrip = isComplete;
  
  const todayActions = useMemo(() => getTeacherTodayActions(teacher), [teacher]);
  
  // Get today's sessions with more detail
  const todaySessions = useMemo(() => {
    return getUpcomingSessions(teacher, 0).slice(0, 6);
  }, [teacher]);
  
  // Find the next upcoming or current class
  const nextClass = useMemo(() => {
    if (todaySessions.length === 0) return null;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    for (const session of todaySessions) {
      const [sh, sm] = session.startTime.split(':').map(Number);
      const [eh, em] = session.endTime.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      
      // Currently in class or about to start (within 15 mins)
      if (currentTime >= startMins - 15 && currentTime <= endMins) {
        return { ...session, status: currentTime < startMins ? 'upcoming' : 'active' };
      }
      // Next class
      if (currentTime < startMins) {
        return { ...session, status: 'next' };
      }
    }
    return todaySessions[0] ? { ...todaySessions[0], status: 'later' } : null;
  }, [todaySessions]);

  // Get sections needing attention (pending attendance)
  const sectionsNeedingAttendance = useMemo(() => {
    const sections = [];
    courses.forEach(course => {
      course.sections?.forEach(section => {
        // For MVP, show all today's classes as potentially needing attendance
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

  // Quick stats - actionable only
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
      color: todayActions.pendingAttendance > 0 ? "amber" : "green",
      action: sectionsNeedingAttendance[0] 
        ? () => navigate(`/course/${sectionsNeedingAttendance[0].courseId}/class/${sectionsNeedingAttendance[0].sectionId}?tab=attendance`)
        : null,
      urgent: todayActions.pendingAttendance > 0,
    },
    {
      label: "Assignments Due",
      value: todayActions.assignmentsDue,
      icon: BookOpen,
      color: todayActions.assignmentsDue > 0 ? "amber" : "green",
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

  return (
    <PageShell width="5xl">
      {/* Setup Strip - Shows when onboarding is not complete */}
      {showSetupStrip && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium">
              Complete your setup to unlock all features
            </p>
          </div>
          <button
            onClick={() => {
              resetOnboarding();
              setShowOnboarding(true);
            }}
            className="px-4 py-2 rounded-lg bg-white text-purple-700 text-sm font-medium hover:bg-purple-50 transition-colors"
          >
            Complete Setup
          </button>
        </motion.div>
      )}

      {/* Header - Personalized greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black-800">
          {greeting}, {teacher?.name?.split(' ')[0] || 'Teacher'}
        </h1>
        <p className="text-black-500 mt-1">
          {todaySessions.length > 0 
            ? `You have ${todaySessions.length} class${todaySessions.length > 1 ? 'es' : ''} today`
            : "No classes scheduled for today"
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Next Class Card - Hero element */}
          {nextClass && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-2xl p-5 ${
                nextClass.status === 'active' 
                  ? 'bg-gradient-to-br from-purple-700 to-indigo-400' 
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
                      {nextClass.startTime} – {nextClass.endTime}
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
              
              {/* Quick Actions for this class */}
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

          {/* Quick Stats - Actionable */}
          <div className="grid grid-cols-3 gap-4">
            {quickStats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <motion.button
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={stat.action}
                  disabled={!stat.action}
                  className={`relative p-4 bg-white rounded-xl border transition-all text-left ${
                    stat.action 
                      ? 'border-black-200 hover:border-indigo-300 hover:shadow-md cursor-pointer' 
                      : 'border-black-200 cursor-default'
                  } ${stat.urgent ? 'ring-2 ring-yellow-200' : ''}`}
                >
                  <div className={`inline-flex p-2 rounded-lg mb-2 ${
                    stat.color === 'amber' ? 'bg-yellow-100' :
                    stat.color === 'green' ? 'bg-green-100' : 'bg-indigo-100'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      stat.color === 'amber' ? 'text-yellow-600' :
                      stat.color === 'green' ? 'text-green-600' : 'text-indigo-600'
                    }`} />
                  </div>
                  <p className="text-2xl font-bold text-black-800">{stat.value}</p>
                  <p className="text-xs text-black-500 mt-0.5">{stat.label}</p>
                  {stat.action && (
                    <ChevronRight className="absolute top-4 right-3 w-4 h-4 text-black-300" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* My Classes - Quick Access */}
          <div className="bg-white rounded-xl border border-black-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-black-800">My Classes</h3>
              <button 
                onClick={() => navigate("/classes")}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courses.slice(0, 4).map((course) => {
                const syllabus = getSyllabusByRef(course.syllabusRef);
                return course.sections?.slice(0, 2).map((section) => {
                  // Calculate progress
                  let progress = 0;
                  if (syllabus) {
                    const baseProgress = normalizeSectionProgress(syllabus, section.progress);
                    const storedProgress = loadStoredProgress(section.id, baseProgress);
                    progress = calculateTopicProgressPercent(syllabus, storedProgress);
                  }
                  
                  return (
                    <button
                      key={`${course.id}-${section.id}`}
                      onClick={() => navigate(`/course/${course.id}/class/${section.id}`)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-black-50 hover:bg-black-100 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {section.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-black-800 truncate">
                          {course.title.replace('Grade ', 'G')}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-black-500">{progress}%</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-black-400" />
                    </button>
                  );
                });
              }).flat()}
            </div>
          </div>

          {/* AI Quick Actions - Simplified */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-800">AI Assistant</h3>
                <p className="text-xs text-neutral-500">Try these quick actions</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "What's my day look like?",
                "Take attendance for my next class",
                "Which class needs attention?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    // This will be connected to the AI chat bar
                    const chatBar = document.querySelector('[data-chat-input]');
                    if (chatBar) {
                      chatBar.value = prompt;
                      chatBar.focus();
                    }
                  }}
                  className="px-3 py-2 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Today's Schedule with Day Navigation */}
          <UpcomingClasses showDayNav daysAhead={0} />
          
          {/* Notices - Collapsed by default on mobile */}
          <NoticesPanel />
        </div>
      </div>

      {/* Onboarding Wizard - Shows once for new users or when forced */}
      <SplashOnboarding 
        forceShow={showOnboarding} 
        onComplete={() => setShowOnboarding(false)} 
      />
    </PageShell>
  );
}
