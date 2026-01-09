import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Users, Clock, Calendar, CheckCircle2, Circle, 
  BookOpen, FileText, TrendingUp, ChevronRight, Target, Award, 
  ChevronDown, Play, Edit3, BarChart2, History
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
} from "../data/dummyData";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { SyllabusProgress } from "../components/syllabus";
import { AttendanceEditor, AttendanceHistoryModal } from "../components/attendance";
import { ClassAssessments } from "../components/teacher";
import { AttendanceAnalytics } from "../components/analytics";
import SyllabusAnalytics from "../components/analytics/SyllabusAnalytics";
import { getExamsForClass } from "../data/dummyData";
import { useClassTimer } from "../hooks/useClassTimer";
import { PageShell } from "../components/layout";
import { loadUserState, saveUserState } from "../utils/userScopedStorage";
import { useTeacher } from "../context/TeacherContext";
import { calculateTopicProgressPercent } from "../data/dummyData";

/**
 * ClassPage - Redesigned single-page layout
 * No tabs - everything flows naturally with collapsible sections
 */
export default function ClassPage() {
  const { courseId, classId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const activeTeacher = teacherCtx?.teacher || teacherData;
  const course = activeTeacher.courses.find((c) => c.id === courseId);
  
  // Section expand states
  const [expandedSections, setExpandedSections] = useState({
    syllabus: false,
    attendance: false,
    assessments: false,
  });
  
  // Nested analytics expand states
  const [showSyllabusAnalytics, setShowSyllabusAnalytics] = useState(false);
  const [showAttendanceAnalytics, setShowAttendanceAnalytics] = useState(false);
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  if (!course) return (
    <PageShell width="5xl">
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-neutral-400" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-800 mb-2">Class not found</h2>
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
  const [showHistory, setShowHistory] = useState(false);
  
  useEffect(() => {
    setTopicProgress(normalizeSectionProgress(syllabus, loadStoredProgress(classId, baseProgress)));
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

  const classStudents = students.filter((s) => s.classId === classId);

  // Calculate progress percentage
  const progressPercent = useMemo(() => 
    calculateTopicProgressPercent(syllabus, topicProgress),
    [syllabus, topicProgress]
  );

  // Attendance metrics
  const attendanceMetrics = useMemo(() => {
    const dates = Object.keys(attendanceByDate);
    const perDayPercents = dates.map(d => {
      const recs = attendanceByDate[d];
      const present = recs.filter(r => r.status === 'present').length;
      return recs.length ? (present / recs.length) * 100 : 0;
    });
    const avgPercent = perDayPercents.length 
      ? Math.round(perDayPercents.reduce((s, c) => s + c, 0) / perDayPercents.length) 
      : 0;
    
    return { totalDays: dates.length, avgPercent };
  }, [attendanceByDate]);
  
  const handleProgressSave = (updated) => {
    const normalized = normalizeSectionProgress(syllabus, updated);
    setTopicProgress(normalized);
    persistProgress(classId, normalized);
    toast.success("Syllabus progress saved.");
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

  // Auto-expand based on URL
  useEffect(() => {
    const tab = search.get('tab');
    if (tab === 'syllabus') setExpandedSections(prev => ({ ...prev, syllabus: true }));
    if (tab === 'attendance') setExpandedSections(prev => ({ ...prev, attendance: true }));
    if (tab === 'assessments') setExpandedSections(prev => ({ ...prev, assessments: true }));
  }, [search]);

  return (
    <PageShell width="5xl">
      {/* Compact Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
          <button onClick={() => navigate("/dashboard")} className="hover:text-indigo-600 transition-colors">
            Dashboard
          </button>
          <ChevronRight className="w-4 h-4" />
          <button onClick={() => navigate(`/course/${courseId}`)} className="hover:text-indigo-600 transition-colors">
            {course.title}
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-neutral-800 font-medium">Section {classId}</span>
        </div>
        
        {/* Title Row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">
              {course.title} - Section {classId}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {schedules[0] || 'No schedule'}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {classStudents.length} students
              </span>
              {isWithinWindow && (
                <span className="flex items-center gap-1.5 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Class Active
                </span>
              )}
            </div>
          </div>
          
          {/* Quick Action */}
          {isWithinWindow && (
            <button
              onClick={() => setExpandedSections(prev => ({ ...prev, attendance: true }))}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
            >
              <Users className="w-4 h-4" />
              Take Attendance
            </button>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Syllabus', value: `${progressPercent}%`, icon: BookOpen, color: 'indigo' },
          { label: 'Attendance', value: `${attendanceMetrics.avgPercent}%`, icon: Users, color: 'green' },
          { label: 'Days Recorded', value: attendanceMetrics.totalDays, icon: Calendar, color: 'amber' },
          { label: 'Students', value: classStudents.length, icon: Target, color: 'purple' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          const colors = {
            indigo: 'bg-indigo-50 text-indigo-600',
            green: 'bg-green-50 text-green-600',
            amber: 'bg-amber-50 text-amber-600',
            purple: 'bg-purple-50 text-purple-600',
          };
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${colors[stat.color].split(' ')[0]} rounded-xl p-4`}
            >
              <Icon className={`w-5 h-5 ${colors[stat.color].split(' ')[1]} mb-2`} />
              <p className="text-2xl font-bold text-neutral-800">{stat.value}</p>
              <p className="text-xs text-neutral-500">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-4">
        
        {/* Syllabus Section */}
        <CollapsibleSection
          title="Syllabus Progress"
          subtitle={`${progressPercent}% complete – ${syllabus?.chapters?.length || 0} chapters`}
          icon={BookOpen}
          isExpanded={expandedSections.syllabus}
          onToggle={() => toggleSection('syllabus')}
          accentColor="indigo"
        >
          <div className="space-y-4">
            <SyllabusProgress
              syllabus={syllabus}
              progressMap={topicProgress}
              onChange={() => setSaveMessage('')}
              onSave={handleProgressSave}
              editable
              statusMessage={saveMessage}
            />
            
            {/* Nested Syllabus Analytics */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden mt-4">
              <button
                onClick={() => setShowSyllabusAnalytics(!showSyllabusAnalytics)}
                className="w-full flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <BarChart2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="font-medium text-sm text-neutral-700">Syllabus Analytics</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showSyllabusAnalytics ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showSyllabusAnalytics && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-neutral-100">
                      <SyllabusAnalytics
                        syllabus={syllabus}
                        topicProgress={topicProgress}
                        progressPercent={progressPercent}
                        compact
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CollapsibleSection>

        {/* Attendance Section */}
        <CollapsibleSection
          title="Attendance"
          subtitle={`${attendanceMetrics.avgPercent}% avg – ${attendanceMetrics.totalDays} days recorded`}
          icon={Users}
          isExpanded={expandedSections.attendance}
          onToggle={() => toggleSection('attendance')}
          accentColor="green"
          badge={isWithinWindow ? 'Take Now' : null}
        >
          <div className="space-y-4">
            {isWithinWindow && (
              <div className="bg-white-50 rounded-xl p-4 border border-green-200">
                <h4 className="font-medium text-green-800 mb-3">Today's Attendance - {today}</h4>
                <AttendanceEditor
                  classId={classId}
                  date={today}
                  students={classStudents}
                  initialPresent={initialPresent}
                  onSave={handleSaveAttendance}
                />
              </div>
            )}
            
            {/* Nested Attendance Analytics & History */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowAttendanceAnalytics(!showAttendanceAnalytics)}
                className="w-full flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <BarChart2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="font-medium text-sm text-neutral-700">Analytics & History</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showAttendanceAnalytics ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showAttendanceAnalytics && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-neutral-100 space-y-4">
                      {/* View Full History Button */}
                      <button
                        onClick={() => setShowHistory(true)}
                        className="w-full flex items-center justify-between p-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <History className="w-5 h-5 text-indigo-600" />
                          <div className="text-left">
                            <p className="font-medium text-sm text-indigo-800">View Full History</p>
                            <p className="text-xs text-indigo-600">{attendanceMetrics.totalDays} days of records</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
                      </button>
                      
                      <AttendanceAnalytics
                        classId={classId}
                        students={classStudents}
                        attendanceByDate={attendanceByDate}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CollapsibleSection>

        {/* Assessments Section */}
        <CollapsibleSection
          title="Assessments"
          subtitle={`${upcomingExams.length} upcoming`}
          icon={FileText}
          isExpanded={expandedSections.assessments}
          onToggle={() => toggleSection('assessments')}
          accentColor="purple"
        >
          <ClassAssessments classId={classId} />
        </CollapsibleSection>
      </div>

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

/**
 * CollapsibleSection - Reusable expandable section
 */
function CollapsibleSection({ 
  title, 
  subtitle, 
  icon: Icon, 
  isExpanded, 
  onToggle, 
  accentColor = 'indigo',
  badge,
  children 
}) {
  const colors = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  };
  const color = colors[accentColor];
  
  return (
    <motion.div 
      className="bg-white rounded-2xl border border-neutral-200 overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${color.bg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${color.text}`} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-neutral-800">{title}</h3>
              {badge && (
                <span className={`px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text} rounded-full`}>
                  {badge}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500">{subtitle}</p>
          </div>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 border-t border-neutral-100">
              <div className="pt-4">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
