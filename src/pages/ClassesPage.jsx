import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Users, Clock, ChevronRight, Search, Filter,
  Calendar, TrendingUp, CheckCircle, Circle, ArrowUpRight,
  Settings, Plus
} from 'lucide-react';
import {
  teacherData,
  getSyllabusByRef,
  normalizeSectionProgress,
  loadStoredProgress,
  calculateTopicProgressPercent,
  getUpcomingSessions
} from '../data/dummyData';
import { useTeacher } from '../context/TeacherContext';
import { PageShell } from '../components/layout';
import { ProgressBar } from '../components/charts';

/**
 * ClassesPage - Lists all courses and sections for the teacher
 * Accessible from BottomNav "Classes" tab
 */
export default function ClassesPage() {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Get all courses and sections with progress data
  const coursesWithSections = useMemo(() => {
    return (teacher.courses || []).map(course => {
      const syllabus = getSyllabusByRef(course.syllabusRef);
      const sectionsWithProgress = (course.sections || []).map(section => {
        const baseProgress = normalizeSectionProgress(syllabus, section.progress);
        const effective = normalizeSectionProgress(syllabus, loadStoredProgress(section.id, baseProgress));
        const progress = calculateTopicProgressPercent(syllabus, effective);
        return {
          ...section,
          progress,
          studentCount: 30, // Default
        };
      });

      const avgProgress = sectionsWithProgress.length
        ? Math.round(sectionsWithProgress.reduce((sum, s) => sum + s.progress, 0) / sectionsWithProgress.length)
        : 0;

      return {
        ...course,
        syllabus,
        sections: sectionsWithProgress,
        avgProgress,
        totalStudents: sectionsWithProgress.length * 30,
      };
    });
  }, [teacher]);

  // Get upcoming sessions for today
  const todaySessions = useMemo(() => {
    const sessions = getUpcomingSessions(teacher, 0);
    return sessions;
  }, [teacher]);

  // Filter courses/sections based on search and filter
  const filteredCourses = useMemo(() => {
    return coursesWithSections.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.sections.some(s => s.id.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = filterSubject === 'all' ||
        course.syllabus?.subject?.toLowerCase() === filterSubject.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [coursesWithSections, searchQuery, filterSubject]);

  // Get unique subjects for filter
  const subjects = useMemo(() => {
    const subjectSet = new Set(coursesWithSections.map(c => c.syllabus?.subject).filter(Boolean));
    return ['all', ...Array.from(subjectSet)];
  }, [coursesWithSections]);

  return (
    <PageShell width="6xl">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-black-800">My Classes</h1>
            <p className="text-black-500">
              {coursesWithSections.length} courses • {coursesWithSections.reduce((sum, c) => sum + c.sections.length, 0)} sections
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search classes..."
                className="pl-10 pr-4 py-2 bg-white border border-black-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 w-full sm:w-64"
              />
            </div>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2 bg-white border border-black-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {subjects.map(subject => (
                <option key={subject} value={subject}>
                  {subject === 'all' ? 'All Subjects' : subject}
                </option>
              ))}
            </select>
            <button
              onClick={() => navigate('/manage-classes')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Manage</span>
            </button>
          </div>
        </motion.div>

        {/* Today's Classes Banner */}
        {todaySessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <h2 className="font-semibold">Today's Schedule</h2>
              </div>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                {todaySessions.length} {todaySessions.length === 1 ? 'class' : 'classes'}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {todaySessions.slice(0, 3).map((session, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/course/${session.courseId}/class/${session.classId}`)}
                  className="flex items-center gap-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{session.classId}</p>
                    <p className="text-xs text-indigo-200">{session.startTime}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Courses Grid */}
        <div className="space-y-6">
          {filteredCourses.map((course, courseIndex) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: courseIndex * 0.1 }}
              className="bg-white rounded-2xl border border-black-200 overflow-hidden"
            >
              {/* Course Header */}
              <div
                className="p-4 cursor-pointer hover:bg-black-50 transition-colors"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-black-800 truncate">{course.title}</h2>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                        {course.syllabus?.subject}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-black-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {course.sections.length} sections
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {course.syllabus?.chapters?.length || 0} chapters
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <ProgressBar value={course.avgProgress} className="flex-1 h-2" />
                      <span className="text-sm font-medium text-black-700">{course.avgProgress}%</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-black-400 flex-shrink-0" />
                </div>
              </div>

              {/* Sections */}
              <div className="border-t border-black-100">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black-100">
                  {course.sections.map((section, sectionIndex) => (
                    <motion.button
                      key={section.id}
                      onClick={() => navigate(`/course/${course.id}/class/${section.id}`)}
                      className="flex items-center justify-between p-4 bg-white hover:bg-indigo-50 transition-colors text-left"
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm
                          ${section.progress >= 70 ? 'bg-green-100 text-green-700' : ''}
                          ${section.progress >= 40 && section.progress < 70 ? 'bg-yellow-100 text-yellow-700' : ''}
                          ${section.progress < 40 ? 'bg-black-100 text-black-600' : ''}
                        `}>
                          {section.id}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-black-700">Section {section.id}</p>
                          <div className="flex items-center gap-2 text-xs text-black-500">
                            <Clock className="w-3 h-3" />
                            {section.schedules?.[0] || 'No schedule'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`
                          text-lg font-bold
                          ${section.progress >= 70 ? 'text-green-600' : ''}
                          ${section.progress >= 40 && section.progress < 70 ? 'text-yellow-600' : ''}
                          ${section.progress < 40 ? 'text-black-600' : ''}
                        `}>
                          {section.progress}%
                        </p>
                        <p className="text-xs text-black-500">progress</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredCourses.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto bg-black-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-black-400" />
            </div>
            <h3 className="text-lg font-semibold text-black-800 mb-2">No classes found</h3>
            <p className="text-black-500">
              {searchQuery ? 'Try a different search term' : 'No courses assigned yet'}
            </p>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
}
