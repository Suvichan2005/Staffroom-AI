import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Users, Clock, Calendar, CheckCircle2, Circle, 
  Play, Pause, BookOpen, FileText, TrendingUp,
  Mic, ChevronRight, Target, Award, Sparkles, X
} from "lucide-react";
import {
  teacherData,
  getSyllabusByRef,
  getSectionProgress,
  getAttendanceForClass,
  students,
  normalizeSectionProgress,
  loadStoredProgress,
  persistProgress,
  getNextTopic,
} from "../data/dummyData";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import { SyllabusProgress } from "../components/syllabus";
import { AttendanceEditor, AttendanceHistoryModal } from "../components/attendance";
import { AssignmentSummary, ClassAssessments } from "../components/teacher";
import { SectionAnalytics, AttendanceAnalytics, SyllabusAnalytics } from "../components/analytics";
import { getExamsForClass } from "../data/dummyData";
import { useClassTimer } from "../hooks/useClassTimer";
import { PageShell } from "../components/layout";
import { GlobalAssistant } from "../components/ai";
import SmartAISuggestions from "../components/ai/SmartAISuggestions";
import { AssessmentManager } from "../components/shared";
import { VoiceHints, CLASS_PAGE_HINTS } from "../components/shared";
import { loadUserState, saveUserState } from "../utils/userScopedStorage";
import { useTeacher } from "../context/TeacherContext";
import { ProgressBar } from "../components/charts";
import { calculateTopicProgressPercent } from "../data/dummyData";
import { generateSectionSuggestions } from "../services/aiService";

export default function ClassPage() {
  const { courseId, classId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const activeTeacher = teacherCtx?.teacher || teacherData;
  const course = activeTeacher.courses.find((c) => c.id === courseId);
  
  if (!course) return (
    <PageShell width="6xl">
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-black-100 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-black-400" />
        </div>
        <h2 className="text-lg font-semibold text-black-800 mb-2">Class not found</h2>
        <button 
          onClick={() => navigate("/dashboard")}
          className="text-indigo-600 text-sm font-medium hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    </PageShell>
  );

  const syllabus = getSyllabusByRef(course.syllabusRef);
  const baseProgress = useMemo(
    () => getSectionProgress(activeTeacher, courseId, classId),
    [activeTeacher, courseId, classId]
  );
  const [topicProgress, setTopicProgress] = useState(() =>
    normalizeSectionProgress(syllabus, loadStoredProgress(classId, baseProgress))
  );
  const [saveMessage, setSaveMessage] = useState("");
  const saveMessageTimeout = useRef(null);
  const [attendanceVersion, setAttendanceVersion] = useState(0);
  const progressCardRef = useRef(null);
  const attendanceEditorRef = useRef(null);
  const [attendanceExpanded, setAttendanceExpanded] = useState(false);
  
  const clearSaveMessage = () => {
    if (saveMessageTimeout.current) {
      clearTimeout(saveMessageTimeout.current);
    }
    setSaveMessage("");
  };
  
  useEffect(() => {
    setTopicProgress(normalizeSectionProgress(syllabus, loadStoredProgress(classId, baseProgress)));
    if (saveMessageTimeout.current) {
      clearTimeout(saveMessageTimeout.current);
    }
    setSaveMessage("");
  }, [classId, baseProgress, syllabus]);

  useEffect(() => () => {
    if (saveMessageTimeout.current) {
      clearTimeout(saveMessageTimeout.current);
    }
  }, []);

  // React to external progress updates (e.g., VoiceProgressLogger)
  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.classId === classId) {
        const updated = loadStoredProgress(classId, baseProgress);
        setTopicProgress(normalizeSectionProgress(syllabus, updated));
        setSaveMessage('');
      }
    };
    window.addEventListener('syllabus-progress-updated', handler);
    return () => window.removeEventListener('syllabus-progress-updated', handler);
  }, [classId, baseProgress, syllabus]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const attendanceByDate = useMemo(() => {
    const grouped = getAttendanceForClass(classId, null);
    const next = { ...grouped };
    const override = loadUserState(`attendance:final:${classId}:${today}`, null);
    if (override?.presentMap) {
      const overrideDate = override.date || today;
      const records = Object.entries(override.presentMap).map(([studentId, present]) => ({
        studentId,
        classId,
        date: overrideDate,
        status: present ? "present" : "absent",
        method: "demo",
      }));
      next[overrideDate] = records;
    }
    return next;
  }, [classId, today, attendanceVersion]);
  
  const section = course.sections.find(s => s.id === classId);
  const schedules = section?.schedules || (section?.schedule ? [section.schedule] : []);
  const isWithinWindow = useClassTimer(schedules, 15);

  const [showHistory, setShowHistory] = useState(false);

  // Support tab switching via URL query param
  const initialTab = useMemo(() => {
    const tabParam = search.get('tab');
    if (tabParam && ['overview', 'syllabus', 'attendance', 'assessments'].includes(tabParam)) {
      return tabParam;
    }
    return 'overview';
  }, [search]);
  
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Sync tab with URL changes
  useEffect(() => {
    const tabParam = search.get('tab');
    if (tabParam && ['overview', 'syllabus', 'attendance', 'assessments'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [search]);

  // Calculate progress percentage
  const progressPercent = useMemo(() => 
    calculateTopicProgressPercent(syllabus, topicProgress),
    [syllabus, topicProgress]
  );

  // Attendance metrics
  const attendanceMetrics = useMemo(() => {
    const dates = Object.keys(attendanceByDate);
    const classStudentsList = students.filter((s) => s.classId === classId);
    const perDayPercents = dates.map(d => {
      const recs = attendanceByDate[d];
      const present = recs.filter(r => r.status === 'present').length;
      return recs.length ? (present / recs.length) * 100 : 0;
    });
    const avgPercent = perDayPercents.length 
      ? Math.round(perDayPercents.reduce((s, c) => s + c, 0) / perDayPercents.length) 
      : 0;
    
    const studentPercents = classStudentsList.map(stu => {
      const logs = Object.values(attendanceByDate).flat().filter(r => r.studentId === stu.studentId);
      if (!logs.length) return 0;
      const present = logs.filter(l => l.status === 'present').length;
      return (present / logs.length) * 100;
    });
    
    return {
      totalDays: dates.length,
      avgPercent,
      bestPercent: studentPercents.length ? Math.round(Math.max(...studentPercents)) : 0,
      worstPercent: studentPercents.length ? Math.round(Math.min(...studentPercents)) : 0,
    };
  }, [attendanceByDate, classId]);

  const quickScrollToProgress = () => {
    // If not on syllabus tab, switch first then scroll after animation
    if (activeTab !== "syllabus") {
      setActiveTab("syllabus");
      // Framer motion animations take ~300ms, wait for them to complete
      setTimeout(() => {
        const syllabusEditor = document.querySelector('[data-syllabus-progress]');
        if (syllabusEditor) {
          syllabusEditor.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 350);
    } else {
      // Already on syllabus tab, scroll immediately
      const syllabusEditor = document.querySelector('[data-syllabus-progress]');
      if (syllabusEditor) {
        syllabusEditor.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const quickScrollToAttendance = () => {
    // If not on attendance tab, switch first then scroll after animation
    if (activeTab !== "attendance") {
      setActiveTab("attendance");
      // Expand the section and scroll after animation
      setTimeout(() => {
        setAttendanceExpanded(true);
        if (attendanceEditorRef.current) {
          attendanceEditorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 350);
    } else {
      // Already on attendance tab, expand and scroll
      setAttendanceExpanded(true);
      setTimeout(() => {
        if (attendanceEditorRef.current) {
          attendanceEditorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };
  
  // Handle deep link to take attendance
  useEffect(() => {
    if (search.get('take') === '1' && isWithinWindow) {
      setTimeout(() => quickScrollToAttendance(), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isWithinWindow]);

  const classStudents = students.filter((s) => s.classId === classId);
  
  const handleProgressSave = (updated) => {
    const normalized = normalizeSectionProgress(syllabus, updated);
    setTopicProgress(normalized);
    persistProgress(classId, normalized);
    setSaveMessage("Progress saved locally.");
    toast.success("Syllabus progress saved.");
    if (saveMessageTimeout.current) {
      clearTimeout(saveMessageTimeout.current);
    }
    saveMessageTimeout.current = setTimeout(() => setSaveMessage(""), 3000);
  };

  const initialPresent = useMemo(() => {
    const todays = attendanceByDate[today] || [];
    const map = {};
    classStudents.forEach(s => {
      const rec = todays.find(r => r.studentId === s.studentId);
      map[s.studentId] = rec ? rec.status === 'present' : false;
    });
    return map;
  }, [attendanceByDate, today, classStudents]);

  const handleSaveAttendance = (presentMap) => {
    const payload = { classId, date: today, presentMap };
    saveUserState(`attendance:final:${classId}:${today}`, payload);
    toast.success("Attendance recorded.");
    setAttendanceVersion((prev) => prev + 1);
  };

  const upcomingExams = getExamsForClass(courseId, classId, activeTeacher);

  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "syllabus", label: "Syllabus", icon: BookOpen },
    { id: "attendance", label: "Attendance", icon: Users },
    { id: "assessments", label: "Assessments", icon: FileText },
  ];

  return (
    <PageShell width="6xl">
      {/* Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl mb-4 sm:mb-6"
      >
        <img 
          src={course.imageUrl} 
          alt={course.title} 
          className="w-full h-44 md:h-56 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Breadcrumb Navigation */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex items-center justify-between">
          <nav className="flex items-center gap-1.5 sm:gap-2 text-sm min-w-0 flex-1">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors flex-shrink-0"
              style={{ color: '#ffffff' }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors truncate max-w-[100px] sm:max-w-none text-xs sm:text-sm">Home</span>
            </button>
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} />
            <button
              onClick={() => navigate(`/course/${courseId}`)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors truncate max-w-[100px] sm:max-w-none text-xs sm:text-sm"
              style={{ color: '#ffffff' }}
            >
              {course.title}
            </button>
          </nav>
        </div>

        {/* Class Info (desktop/md+ - absolute overlay) */}
        <div className="hidden md:block absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                <span className="px-2 py-0.5 bg-indigo-500/80 backdrop-blur-sm rounded-full text-[10px] sm:text-xs whitespace-nowrap" style={{ color: '#ffffff' }}>
                  Section {classId}
                </span>
                {isWithinWindow && (
                  <span className="px-2 py-0.5 bg-green-500/80 backdrop-blur-sm rounded-full text-[10px] sm:text-xs flex items-center gap-1 whitespace-nowrap" style={{ color: '#ffffff' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Active
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold drop-shadow-lg truncate" style={{ color: '#ffffff' }}>
                {course.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="truncate max-w-[100px] sm:max-w-none">{schedules[0] || 'No schedule'}</span>
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {classStudents.length} students
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3">
              <div className="text-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
                <p className="text-2xl font-bold" style={{ color: '#ffffff' }}>{progressPercent}%</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Progress</p>
              </div>
              <div className="text-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
                <p className="text-2xl font-bold" style={{ color: '#ffffff' }}>{attendanceMetrics.avgPercent}%</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Attendance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Class Info (overlay on top of banner for small screens) */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm rounded-b-2xl z-20">
          <div className="flex flex-col gap-2">
            <div>
                  <h1 className="text-lg text-white truncate">{course.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-black-600">
                <span className="px-2 py-0.5 text-white">Section {classId}</span>
                {isWithinWindow && (
                  <span className="px-2 py-0.5 bg-green-100 rounded-full text-green-700">Active</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{progressPercent}%</p>
                  <p className="text-xs text-white">Progress</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{attendanceMetrics.avgPercent}%</p>
                  <p className="text-xs text-white">Attendance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Action Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <button
          onClick={quickScrollToAttendance}
          disabled={!isWithinWindow}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
            ${isWithinWindow 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700' 
              : 'bg-black-100 text-black-400 cursor-not-allowed'
            }
          `}
          title={isWithinWindow ? 'Take attendance' : `Available during ${schedules.join(', ')} ±15min`}
        >
          <Users className="w-4 h-4" />
          Take Attendance
        </button>
        <button
          onClick={quickScrollToProgress}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Mark Syllabus
        </button>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div data-syllabus-progress
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700' 
                  : 'bg-white text-black-600 hover:bg-black-50 border border-black-200'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid md:grid-cols-12 gap-6 w-full overflow-hidden"
          >
            {/* Main Content */}
            <div className="md:col-span-8 space-y-6 min-w-0">
              {/* Progress Overview */}
              <div className="bg-white rounded-2xl border border-black-200 p-4 sm:p-5 overflow-hidden">
                <h3 className="font-semibold text-black-800 mb-4">Progress Overview</h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Syllabus Progress */}
                  <div className="p-3 sm:p-4 rounded-xl bg-indigo-50">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mb-1 sm:mb-2" />
                    <p className="text-xl sm:text-2xl font-bold text-indigo-700">{progressPercent}%</p>
                    <p className="text-[10px] sm:text-xs text-black-600">Syllabus</p>
                  </div>
                  {/* Attendance */}
                  <div className="p-3 sm:p-4 rounded-xl bg-green-50">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mb-1 sm:mb-2" />
                    <p className="text-xl sm:text-2xl font-bold text-green-700">{attendanceMetrics.avgPercent}%</p>
                    <p className="text-[10px] sm:text-xs text-black-600">Attendance</p>
                  </div>
                  {/* Days Recorded */}
                  <div className="p-3 sm:p-4 rounded-xl bg-yellow-50">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mb-1 sm:mb-2" />
                    <p className="text-xl sm:text-2xl font-bold text-yellow-700">{attendanceMetrics.totalDays}</p>
                    <p className="text-[10px] sm:text-xs text-black-600">Days Recorded</p>
                  </div>
                  {/* Best Attendance */}
                  <div className="p-3 sm:p-4 rounded-xl bg-blue-50">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mb-1 sm:mb-2" />
                    <p className="text-xl sm:text-2xl font-bold text-blue-700">{attendanceMetrics.bestPercent}%</p>
                    <p className="text-[10px] sm:text-xs text-black-600">Best Attendance</p>
                  </div>
                </div>
              </div>

              {/* Upcoming Exams */}
              <div className="bg-white rounded-2xl border border-black-200 p-5">
                <h3 className="font-semibold text-black-800 mb-4">Upcoming Exams</h3>
                {upcomingExams.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="w-10 h-10 text-black-300 mx-auto mb-2" />
                    <p className="text-sm text-black-500">No exams scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingExams.map((ex, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-black-50 hover:bg-indigo-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                            <FileText className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-black-800">{ex.type}</p>
                            <p className="text-xs text-black-500">{ex.date}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                          Up to Ch-{ex.syllabusUpTo}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignments */}
              <AssignmentSummary classId={classId} />
            </div>

            {/* Sidebar */}
            <div className="md:col-span-4 space-y-6">
              {/* Voice Hints - Help users discover voice commands */}
              <VoiceHints 
                hints={CLASS_PAGE_HINTS}
                collapsible
                defaultExpanded={false}
              />

              {/* AI Suggestions */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
                <SmartAISuggestions
                  contextKey={`class_${classId}`}
                  generateSuggestions={() => generateSectionSuggestions(classId)}
                  title="AI Suggestions"
                  variant="purple"
                />
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-black-200 p-5">
                <h3 className="font-semibold text-black-800 mb-4">Quick Actions (in-progress)</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Generate Quiz', icon: Sparkles, onClick: () => {} },
                    { label: 'Create Assignment', icon: FileText, onClick: () => setActiveTab('assessments') },
                    { label: 'View All Students', icon: Users, onClick: () => setShowHistory(true) },
                  ].map((action, i) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={i}
                        onClick={action.onClick}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-black-50 transition-colors text-left"
                      >
                        <div className="p-2 rounded-lg bg-black-100">
                          <Icon className="w-4 h-4 text-black-600" />
                        </div>
                        <span className="text-sm font-medium text-black-700">{action.label}</span>
                        {action.inProgress && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">In Progress</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-black-400 ml-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "syllabus" && (
          <motion.div
            key="syllabus"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            ref={progressCardRef}
            className="space-y-6"
          >
            {/* Syllabus Progress Editor - MOVED TO TOP */}
            <div>
              <SyllabusProgress
                syllabus={syllabus}
                progressMap={topicProgress}
                onChange={() => clearSaveMessage()}
                onSave={handleProgressSave}
                editable
                statusMessage={saveMessage}
              />
            </div>

            {/* Syllabus Analytics Section */}
            <SyllabusAnalytics
              syllabus={syllabus}
              topicProgress={topicProgress}
              progressPercent={progressPercent}
              compact
            />
          </motion.div>
        )}

        {activeTab === "attendance" && (
          <motion.div
            key="attendance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Attendance Quick Actions Card */}
            <div className="bg-white rounded-2xl border border-black-200 p-5"
                ref={attendanceEditorRef}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-black-800">Attendance Overview</h3>
                  <p className="text-sm text-black-500">{attendanceMetrics.totalDays} days recorded</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-black-100 text-black-700 hover:bg-black-200 transition-all"
                  >
                    <Calendar className="w-4 h-4" />
                    View History
                  </button>
                  <button
                    onClick={quickScrollToAttendance}
                    disabled={!isWithinWindow}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                      ${isWithinWindow 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                        : 'bg-black-100 text-black-400 cursor-not-allowed'
                      }
                    `}
                  >
                    <Users className="w-4 h-4" />
                    Take Attendance
                  </button>
                </div>
              </div>
            </div>

            {/* Take Attendance Expandable Section */}
            {isWithinWindow && (
              <div 
                className="bg-white rounded-2xl border border-black-200 overflow-hidden"
              >
                <button
                  onClick={() => setAttendanceExpanded(!attendanceExpanded)}
                  className="w-full flex items-center justify-between p-5 hover:bg-black-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-black-800">Take Attendance</h3>
                      <p className="text-sm text-black-500">{today} • {classStudents.length} students</p>
                    </div>
                  </div>
                  <ChevronRight 
                    className={`w-5 h-5 text-black-400 transition-transform ${
                      attendanceExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                
                <AnimatePresence>
                  {attendanceExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-black-200"
                    >
                      <div className="p-5">
                        <AttendanceEditor
                          classId={classId}
                          date={today}
                          students={classStudents}
                          initialPresent={initialPresent}
                          onSave={(presentMap) => {
                            handleSaveAttendance(presentMap);
                            setAttendanceExpanded(false);
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Attendance Analytics */}
            <AttendanceAnalytics
              classId={classId}
              students={classStudents}
              attendanceByDate={attendanceByDate}
            />
          </motion.div>
        )}

        {activeTab === "assessments" && (
          <motion.div
            key="assessments"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ClassAssessments classId={classId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attendance History Modal */}
      {showHistory && (
        <AttendanceHistoryModal
          classId={classId}
          onClose={() => setShowHistory(false)}
          mergeTodayOverride={loadUserState(`attendance:final:${classId}:${today}`, null)}
        />
      )}

    </PageShell>
  );
}
