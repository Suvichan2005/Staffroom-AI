import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Users, Clock, Calendar, CheckCircle2, Circle, 
  BookOpen, FileText, TrendingUp, ChevronRight, Target, Award, 
  Play, Edit3, BarChart2, Layers, GraduationCap, ChevronDown
} from "lucide-react";
import {
  teacherData,
  getSyllabusByRef,
  students,
  normalizeSectionProgress,
  loadStoredProgress,
  calculateTopicProgressPercent,
} from "../data/dummyData";
import { useState, useMemo } from "react";
import { PageShell } from "../components/layout";
import { useTeacher } from "../context/TeacherContext";
import { ScrollContainer } from "../components/shared/ScrollableList";

/**
 * CoursePage - Redesigned single-page overview
 * Shows course overview with all sections visible
 */
export default function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const activeTeacher = teacherCtx?.teacher || teacherData;
  const course = activeTeacher.courses.find((c) => c.id === courseId);
  
  if (!course) return (
    <PageShell width="5xl">
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-neutral-400" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-800 mb-2">Course not found</h2>
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
  const sections = course.sections || [];
  
  // State for expanded analytics and syllabus chapters
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  
  const toggleChapter = (chapterIdx) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterIdx)) {
        next.delete(chapterIdx);
      } else {
        next.add(chapterIdx);
      }
      return next;
    });
  };
  
  // Calculate aggregated metrics
  const sectionMetrics = useMemo(() => {
    return sections.map(section => {
      const sectionStudents = students.filter(s => s.classId === section.id);
      
      // Calculate progress using existing functions
      let progressPercent = 0;
      if (syllabus) {
        const baseProgress = normalizeSectionProgress(syllabus, section.progress);
        const storedProgress = loadStoredProgress(section.id, baseProgress);
        progressPercent = calculateTopicProgressPercent(syllabus, storedProgress);
      }
      
      return {
        ...section,
        studentCount: sectionStudents.length,
        progressPercent,
      };
    });
  }, [sections, syllabus]);
  
  const totalStudents = sectionMetrics.reduce((sum, s) => sum + s.studentCount, 0);
  const avgProgress = Math.round(
    sectionMetrics.reduce((sum, s) => sum + s.progressPercent, 0) / Math.max(sectionMetrics.length, 1)
  );
  const chaptersCount = syllabus?.chapters?.length || 0;

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
          <span className="text-neutral-800 font-medium">{course.title}</span>
        </div>
        
        {/* Title Row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">{course.title}</h1>
            <p className="text-neutral-500 mt-1">{course.code}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              course.status === 'active' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-neutral-100 text-neutral-600'
            }`}>
              {course.status === 'active' ? 'Active' : course.status}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Sections', value: sections.length, icon: Layers, color: 'indigo' },
          { label: 'Total Students', value: totalStudents, icon: Users, color: 'green' },
          { label: 'Avg Progress', value: `${avgProgress}%`, icon: TrendingUp, color: 'amber' },
          { label: 'Chapters', value: chaptersCount, icon: BookOpen, color: 'purple' },
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

      {/* Sections Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">All Sections</h2>
        
        {sections.length > 4 ? (
          <ScrollContainer maxHeight="380px" className="pr-2">
            <div className="grid gap-4 md:grid-cols-2">
              {sectionMetrics.map((section, i) => (
                <SectionCard 
                  key={section.id} 
                  section={section} 
                  courseId={courseId}
                  index={i}
                  navigate={navigate}
                />
              ))}
            </div>
          </ScrollContainer>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sectionMetrics.map((section, i) => (
              <SectionCard 
                key={section.id} 
                section={section} 
                courseId={courseId}
                index={i}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Course Syllabus Overview */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-800">Course Syllabus</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpandedChapters(new Set(syllabus?.chapters?.map((_, i) => i) || []))}
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              Expand All
            </button>
            <span className="text-neutral-300">|</span>
            <button
              onClick={() => setExpandedChapters(new Set())}
              className="text-xs text-neutral-500 hover:text-neutral-700"
            >
              Collapse All
            </button>
          </div>
        </div>
        
        {syllabus?.chapters?.length > 0 ? (
          <ScrollContainer maxHeight="400px" className="pr-2">
            <div className="space-y-2">
              {syllabus.chapters.map((chapter, idx) => {
                const isExpanded = expandedChapters.has(idx);
                return (
                  <div 
                    key={chapter.id || idx}
                    className="bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100"
                  >
                    {/* Chapter Header - Clickable */}
                    <button
                      onClick={() => toggleChapter(idx)}
                      className="w-full flex items-center gap-4 p-3 hover:bg-neutral-100 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-neutral-800">{chapter.title}</h4>
                        <p className="text-xs text-neutral-500">
                          {chapter.subTopics?.length || 0} topics
                        </p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Subtopics - Expandable */}
                    <AnimatePresence>
                      {isExpanded && chapter.subTopics?.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 border-t border-neutral-100">
                            <ul className="ml-14 space-y-1.5 pt-2">
                              {chapter.subTopics.map((topic, topicIdx) => (
                                <li 
                                  key={topicIdx}
                                  className="flex items-start gap-2 text-sm text-neutral-600"
                                >
                                  <span className="text-indigo-400 mt-0.5">–</span>
                                  <span className="flex-1">{topic.title}</span>
                                  {topic.pageFrom && topic.pageTo && (
                                    <span className="text-xs text-neutral-400">
                                      p.{topic.pageFrom}-{topic.pageTo}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </ScrollContainer>
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No syllabus defined</p>
          </div>
        )}
      </div>

      {/* Analytics Dropdown */}
      <motion.div 
        className="bg-white rounded-2xl border border-neutral-200 overflow-hidden mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="w-full flex items-center justify-between p-5 hover:bg-neutral-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-neutral-800">Analytics & Insights</h3>
              <p className="text-sm text-neutral-500">Section-wise progress heatmap and comparison</p>
            </div>
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-neutral-400 transition-transform ${showAnalytics ? 'rotate-180' : ''}`}
          />
        </button>
        
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-5 pt-0 border-t border-neutral-100">
                <div className="pt-4">
                  {/* Section Progress Comparison */}
                  <div className="mb-6">
                    <h4 className="font-medium text-neutral-700 mb-3">Section-wise Progress Comparison</h4>
                    <div className="space-y-3">
                      {sectionMetrics.map((section, i) => (
                        <div key={section.id} className="flex items-center gap-4">
                          <div className="w-16 text-sm font-medium text-neutral-600">
                            {section.id}
                          </div>
                          <div className="flex-1">
                            <div className="h-4 bg-neutral-100 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${section.progressPercent}%` }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                              />
                            </div>
                          </div>
                          <span className="w-12 text-sm font-semibold text-neutral-800 text-right">
                            {section.progressPercent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chapter-wise Heatmap */}
                  {syllabus?.chapters?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-neutral-700 mb-3">Topic Completion Heatmap</h4>
                      <p className="text-xs text-neutral-500 mb-3">Rows = Sections, Columns = Chapters</p>
                      
                      <div className="overflow-x-auto">
                        <div className="inline-block min-w-full">
                          {/* Header Row */}
                          <div className="flex gap-1 mb-1">
                            <div className="w-16 flex-shrink-0" />
                            {syllabus.chapters.map((ch, i) => (
                              <div 
                                key={i} 
                                className="w-14 flex-shrink-0 text-xs text-center text-neutral-500 truncate"
                                title={ch.title}
                              >
                                Ch {i + 1}
                              </div>
                            ))}
                          </div>
                          
                          {/* Section Rows */}
                          {sectionMetrics.map(section => {
                            // Get stored progress for this section
                            const baseProgress = normalizeSectionProgress(syllabus, section.progress);
                            const storedProgress = loadStoredProgress(section.id, baseProgress);
                            
                            return (
                              <div key={section.id} className="flex gap-1 mb-1">
                                <div className="w-16 flex-shrink-0 text-xs text-neutral-600 font-medium truncate pr-2">
                                  {section.id}
                                </div>
                                {syllabus.chapters.map((chapter, chIdx) => {
                                  // Calculate chapter completion for this section
                                  const topics = chapter.subTopics || [];
                                  const chapterProgress = storedProgress?.[chapter.index]?.topics || {};
                                  const doneCount = topics.filter(t => {
                                    const topicData = chapterProgress[t.index];
                                    const status = typeof topicData === 'string' ? topicData : topicData?.status;
                                    return status === 'done';
                                  }).length;
                                  const percent = topics.length ? Math.round((doneCount / topics.length) * 100) : 0;
                                  
                                  // Color based on percentage
                                  const getHeatColor = (p) => {
                                    if (p === 100) return 'bg-green-500';
                                    if (p >= 75) return 'bg-green-400';
                                    if (p >= 50) return 'bg-amber-400';
                                    if (p >= 25) return 'bg-amber-300';
                                    if (p > 0) return 'bg-amber-200';
                                    return 'bg-neutral-100';
                                  };
                                  
                                  return (
                                    <div 
                                      key={chIdx}
                                      className={`w-14 h-8 flex-shrink-0 rounded ${getHeatColor(percent)} flex items-center justify-center text-xs font-medium ${percent >= 50 ? 'text-white' : 'text-neutral-600'}`}
                                      title={`${section.id} - ${chapter.title}: ${percent}%`}
                                    >
                                      {percent}%
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-4 text-xs text-neutral-500">
                        <span>Legend:</span>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-neutral-100" />
                          <span>0%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-amber-300" />
                          <span>25-50%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-amber-400" />
                          <span>50-75%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-green-400" />
                          <span>75-99%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-green-500" />
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </PageShell>
  );
}

/**
 * SectionCard - Individual section card with progress
 */
function SectionCard({ section, courseId, index, navigate }) {
  const schedules = section.schedules || (section.schedule ? [section.schedule] : []);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-neutral-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => navigate(`/course/${courseId}/class/${section.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-neutral-800 group-hover:text-indigo-600 transition-colors">
            Section {section.id}
          </h3>
          <p className="text-sm text-neutral-500">{section.room || 'No room assigned'}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-indigo-500 transition-colors" />
      </div>
      
      {/* Schedule */}
      {schedules.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-neutral-600 mb-3">
          <Clock className="w-4 h-4 text-neutral-400" />
          <span className="truncate">{schedules[0]}</span>
          {schedules.length > 1 && (
            <span className="text-neutral-400">+{schedules.length - 1}</span>
          )}
        </div>
      )}
      
      {/* Stats Row */}
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-neutral-600">
          <Users className="w-4 h-4 text-neutral-400" />
          {section.studentCount}
        </span>
        
        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${section.progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-neutral-600 min-w-[36px] text-right">
            {section.progressPercent}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
