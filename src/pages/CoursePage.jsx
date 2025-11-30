import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, BookOpen, Users, 
  Calendar, TrendingUp, Play, MoreVertical, Folder, BarChart3, 
  FileText, CheckCircle2, Circle, Clock, ArrowUpRight, Layers, Target, AlertTriangle
} from "lucide-react";
import { getSyllabusByRef, normalizeSectionProgress, loadStoredProgress, calculateTopicProgressPercent, teacherData } from "../data/dummyData";
import { useTeacher } from "../context/TeacherContext";
import { ProgressBar, HeatmapGrid } from "../components/charts";
import { PageShell } from "../components/layout";
import { ResourceGallery } from "../components/shared";
import { getHeatmapMatrix } from "../data/analyticsData";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export default function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedChapters, setExpandedChapters] = useState([]);
  const [highlightedCell, setHighlightedCell] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const course = teacher?.courses?.find((c) => c.id === courseId);
  const syllabus = course ? getSyllabusByRef(course.syllabusRef) : null;
  const heatmapMatrix = useMemo(
    () => (course ? getHeatmapMatrix(course.id, teacher) : null),
    [course, teacher]
  );

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (!course?.sections?.length || !syllabus) return 0;
    let total = 0;
    course.sections.forEach(sec => {
      const baseProgress = normalizeSectionProgress(syllabus, sec.progress);
      const effective = normalizeSectionProgress(syllabus, loadStoredProgress(sec.id, baseProgress));
      total += calculateTopicProgressPercent(syllabus, effective);
    });
    return Math.round(total / course.sections.length);
  }, [course, syllabus]);

  // Detailed section analytics for the Analytics tab
  const sectionAnalyticsData = useMemo(() => {
    if (!course?.sections?.length || !syllabus) return null;

    // Get per-section progress and chapter breakdown
    const sectionsData = course.sections.map(sec => {
      const baseProgress = normalizeSectionProgress(syllabus, sec.progress);
      const effective = normalizeSectionProgress(syllabus, loadStoredProgress(sec.id, baseProgress));
      const progress = calculateTopicProgressPercent(syllabus, effective);
      
      // Calculate chapter-by-chapter progress
      const chapterProgress = syllabus.chapters?.map(chapter => {
        const topics = chapter.subTopics || [];
        const done = topics.filter(t => effective?.[chapter.index]?.topics?.[t.index] === 'done').length;
        return {
          chapterIndex: chapter.index,
          chapterTitle: chapter.title,
          totalTopics: topics.length,
          completedTopics: done,
          percent: topics.length ? Math.round((done / topics.length) * 100) : 0
        };
      }) || [];

      return {
        id: sec.id,
        name: `Section ${sec.id}`,
        progress,
        chapterProgress,
        studentCount: sec.studentCount || 30,
        schedule: Array.isArray(sec.schedules) ? sec.schedules[0] : sec.schedule
      };
    });

    // Identify best and worst sections
    const sorted = [...sectionsData].sort((a, b) => b.progress - a.progress);
    const bestSection = sorted[0];
    const worstSection = sorted[sorted.length - 1];
    const avgProgress = Math.round(sectionsData.reduce((s, sec) => s + sec.progress, 0) / sectionsData.length);

    // Identify chapters needing attention (low avg across sections)
    const chapterStats = syllabus.chapters?.map(chapter => {
      const avgCompletion = Math.round(
        sectionsData.reduce((sum, sec) => {
          const cp = sec.chapterProgress.find(c => c.chapterIndex === chapter.index);
          return sum + (cp?.percent || 0);
        }, 0) / sectionsData.length
      );
      return {
        index: chapter.index,
        title: chapter.title,
        avgCompletion,
        topicsCount: chapter.subTopics?.length || 0
      };
    }) || [];

    const chaptersNeedingAttention = chapterStats.filter(c => c.avgCompletion < 50);

    return {
      sections: sectionsData,
      bestSection,
      worstSection,
      avgProgress,
      chapterStats,
      chaptersNeedingAttention,
      totalChapters: syllabus.chapters?.length || 0,
      totalTopics: syllabus.chapters?.reduce((sum, ch) => sum + (ch.subTopics?.length || 0), 0) || 0
    };
  }, [course, syllabus]);

  useEffect(() => {
    if (syllabus?.chapters?.length) {
      setExpandedChapters([syllabus.chapters[0].index]);
    } else {
      setExpandedChapters([]);
    }
  }, [syllabus]);

  const toggleChapter = (chapterIndex) => {
    setExpandedChapters((prev) =>
      prev.includes(chapterIndex)
        ? prev.filter((idx) => idx !== chapterIndex)
        : [...prev, chapterIndex]
    );
  };

  if (!course) return (
    <PageShell width="5xl">
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-black-100 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-black-400" />
        </div>
        <h2 className="text-lg font-semibold text-black-800 mb-2">Course not found</h2>
        <button 
          onClick={() => navigate("/dashboard")}
          className="text-indigo-600 text-sm font-medium hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    </PageShell>
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "syllabus", label: "Syllabus" },
    { id: "resources", label: "Resources" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <PageShell width="6xl">
      {/* Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl mb-6"
      >
        <img 
          src={course.imageUrl} 
          alt={course.title} 
          className="w-full h-40 md:h-56 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm hover:bg-white/30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors truncate max-w-[100px] sm:max-w-none text-xs sm:text-sm">Home</span>
        </button>

        {/* Course Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs" style={{ color: '#ffffff' }}>
                  {syllabus?.grade ? `Grade ${syllabus.grade}` : 'Course'}
                </span>
                <span className="px-2 py-0.5 bg-indigo-500/80 backdrop-blur-sm rounded-full text-xs" style={{ color: '#ffffff' }}>
                  {course.sections.length} Sections
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold drop-shadow-lg" style={{ color: '#ffffff' }}>
                {course.title}
              </h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {syllabus?.chapters?.length || 0} Chapters • {syllabus?.subject || 'Subject'}
              </p>
            </div>

            {/* Progress Ring */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16" viewBox="0 0 64 64">
                <circle 
                  cx="32" 
                  cy="32" 
                  r="26" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.3)" 
                  strokeWidth="6" 
                />
                <circle 
                  cx="32" 
                  cy="32" 
                  r="26" 
                  fill="none" 
                  stroke="#a5b4fc" 
                  strokeWidth="6" 
                  strokeLinecap="round"
                  strokeDasharray={`${(overallProgress / 100) * 163.36} 163.36`}
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-bold text-sm" style={{ color: '#ffffff' }}>{overallProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Simple Underline Tab Navigation */}
      <div className="border-b border-black-200 mb-6">
        <nav className="flex gap-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative pb-3 text-sm font-medium transition-colors
                  ${isActive ? 'text-indigo-600' : 'text-black-500 hover:text-black-700'}
                `}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="courseTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Sections Grid - First */}
            <div>
              <h2 className="text-lg font-semibold text-black-800 mb-4">Sections</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {course.sections.map((sec, idx) => {
                  const baseProgress = normalizeSectionProgress(syllabus, sec.progress);
                  const effective = normalizeSectionProgress(syllabus, loadStoredProgress(sec.id, baseProgress));
                  const pct = calculateTopicProgressPercent(syllabus, effective);
                  const schedules = Array.isArray(sec.schedules) ? sec.schedules : [sec.schedule].filter(Boolean);
                  
                  return (
                    <motion.div
                      key={sec.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => navigate(`/course/${courseId}/class/${sec.id}`)}
                      className="group bg-white rounded-2xl border border-black-200 p-5 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-bold text-lg">{sec.id}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-black-800 group-hover:text-indigo-600 transition-colors">
                              Section {sec.id}
                            </h3>
                            <p className="text-xs text-black-500">{schedules[0] || 'No schedule'}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-black-300 group-hover:text-indigo-500 transition-colors" />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-black-500">Progress</span>
                          <span className={`font-semibold ${pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-yellow-600' : 'text-black-600'}`}>
                            {pct}%
                          </span>
                        </div>
                        <ProgressBar value={pct} className="h-2" />
                        
                        <div className="flex items-center justify-between pt-2 border-t border-black-100">
                          <div className="flex items-center gap-1 text-xs text-black-500">
                            <Users className="w-3.5 h-3.5" />
                            <span>{sec.studentCount || 30} students</span>
                          </div>
                          {sec.exams?.[0] && (
                            <div className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                              <Calendar className="w-3 h-3" />
                              <span>{sec.exams[0].type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-black-200 p-5">
              <h2 className="text-lg font-semibold text-black-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'View Syllabus', icon: BookOpen, action: () => setActiveTab('syllabus') },
                  { label: 'Resources', icon: Folder, action: () => setActiveTab('resources') },
                  { label: 'Analytics', icon: BarChart3, action: () => setActiveTab('analytics') },
                  { label: 'View All', icon: Layers, action: () => navigate('/classes') },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={i}
                      onClick={item.action}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-black-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-black-600"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Course Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Chapters', value: syllabus?.chapters?.length || 0, icon: BookOpen },
                { label: 'Active Sections', value: course.sections.length, icon: Users },
                { label: 'Upcoming Exams', value: course.sections.reduce((sum, sec) => sum + (sec.exams?.length || 0), 0), icon: Calendar },
                { label: 'Avg Progress', value: `${overallProgress}%`, icon: TrendingUp },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="bg-white rounded-xl border border-black-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black-100 rounded-lg">
                        <Icon className="w-4 h-4 text-black-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-black-800">{item.value}</p>
                        <p className="text-xs text-black-500">{item.label}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === "syllabus" && (
          <motion.div
            key="tracker"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl border border-black-200 p-4 md:p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-black-800">Syllabus Tracker</h2>
                <p className="text-sm text-black-500">{syllabus?.chapters?.length || 0} chapters to cover</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> Done
                </span>
                <span className="flex items-center gap-1">
                  <Circle className="w-3 h-3 text-yellow-500" /> In Progress
                </span>
                <span className="flex items-center gap-1">
                  <Circle className="w-3 h-3 text-black-300" /> Pending
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {(syllabus?.chapters || []).map((ch, idx) => {
                const isExpanded = expandedChapters.includes(ch.index);
                return (
                  <motion.div 
                    key={ch.index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border border-black-200 rounded-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleChapter(ch.index)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-black-50 hover:bg-black-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-sm">
                          {ch.index}
                        </span>
                        <div className="text-left">
                          <p className="font-medium text-black-800">{ch.title}</p>
                          <p className="text-xs text-black-500">{(ch.subTopics || []).length} topics</p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-black-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-black-400" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-2 p-3 bg-white" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                            {(ch.subTopics || []).map((st) => (
                              <div 
                                key={st.index}
                                className="flex items-center gap-2 p-2 border border-black-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
                              >
                                <Circle className="w-4 h-4 text-black-300 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm text-black-700 truncate" title={st.title}>
                                    {st.title}
                                  </p>
                                  <p className="text-[10px] text-black-400">p.{st.pageFrom}-{st.pageTo}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === "resources" && (
          <motion.div
            key="resources"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ResourceGallery 
              className="bg-white rounded-2xl border border-black-200 p-4 md:p-6" 
              title="Shared Resources" 
              courseId={course.id} 
            />
          </motion.div>
        )}

        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-black-200 p-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-black-800">{sectionAnalyticsData?.avgProgress || 0}%</p>
                <p className="text-xs text-black-500">Avg Progress</p>
              </div>
              <div className="bg-white rounded-xl border border-black-200 p-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-black-800">{sectionAnalyticsData?.bestSection?.progress || 0}%</p>
                <p className="text-xs text-black-500">Best Section ({sectionAnalyticsData?.bestSection?.id})</p>
              </div>
              <div className="bg-white rounded-xl border border-black-200 p-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-black-800">{sectionAnalyticsData?.totalChapters || 0}</p>
                <p className="text-xs text-black-500">Chapters</p>
              </div>
              <div className="bg-white rounded-xl border border-black-200 p-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-black-800">{sectionAnalyticsData?.totalTopics || 0}</p>
                <p className="text-xs text-black-500">Topics</p>
              </div>
            </div>

            {/* Section Comparison Bar Chart */}
            <div className="bg-white rounded-2xl border border-black-200 p-5">
              <h3 className="font-semibold text-black-800 mb-4">Section Progress Comparison</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionAnalyticsData?.sections || []} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} width={80} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl border border-black-200 shadow-lg text-sm">
                            <p className="font-semibold text-black-800">{data.name}</p>
                            <p className="text-indigo-600 font-bold">{data.progress}% Complete</p>
                            <p className="text-black-500 text-xs">{data.studentCount} students • {data.schedule}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="progress" radius={[0, 6, 6, 0]} barSize={20}>
                      {(sectionAnalyticsData?.sections || []).map((entry, index) => (
                        <Cell 
                          key={index} 
                          fill={entry.progress >= 70 ? '#10b981' : entry.progress >= 40 ? '#f59e0b' : '#6366f1'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Heatmap Section */}
            <div className="bg-white rounded-2xl border border-black-200 p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-semibold text-black-800">Chapter Completion Heatmap</h3>
                  <p className="text-sm text-black-500">
                    Visualize chapter progress across all sections
                  </p>
                </div>
                <div className="p-3 bg-black-50 rounded-xl min-w-[200px]">
                  {highlightedCell ? (
                    <div className="text-sm">
                      <p className="font-medium text-black-700">{highlightedCell.sectionId}</p>
                      <p className="text-black-500">{highlightedCell.chapterTitle}</p>
                      <p className="text-indigo-600 font-bold text-lg">{highlightedCell.percent}%</p>
                    </div>
                  ) : (
                    <p className="text-sm text-black-500">Hover a cell to see details</p>
                  )}
                </div>
              </div>
              {heatmapMatrix ? (
                <HeatmapGrid matrix={heatmapMatrix} onHover={setHighlightedCell} />
              ) : (
                <p className="text-sm text-black-500 text-center py-8">No analytics data available</p>
              )}
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-black-100">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span className="text-xs text-black-500">80%+</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-400" />
                  <span className="text-xs text-black-500">50-79%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-black-200" />
                  <span className="text-xs text-black-500">&lt;50%</span>
                </div>
              </div>
            </div>

            {/* Chapters Needing Attention */}
            {sectionAnalyticsData?.chaptersNeedingAttention?.length > 0 && (
              <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800">Chapters Needing Attention</h3>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sectionAnalyticsData.chaptersNeedingAttention.map(chapter => (
                    <div key={chapter.index} className="bg-white rounded-xl border border-yellow-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                          <span className="font-bold text-yellow-600">{chapter.index}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black-800 truncate">{chapter.title}</p>
                          <p className="text-xs text-yellow-600">
                            {chapter.avgCompletion}% avg • {chapter.topicsCount} topics
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chapter Progress Details */}
            <div className="bg-white rounded-2xl border border-black-200 p-5">
              <h3 className="font-semibold text-black-800 mb-4">Chapter Progress by Section</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black-200">
                      <th className="text-left py-2 px-3 font-medium text-black-600">Chapter</th>
                      {sectionAnalyticsData?.sections?.map(sec => (
                        <th key={sec.id} className="text-center py-2 px-3 font-medium text-black-600">{sec.id}</th>
                      ))}
                      <th className="text-center py-2 px-3 font-medium text-black-600">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionAnalyticsData?.chapterStats?.map(chapter => (
                      <tr key={chapter.index} className="border-b border-black-100 hover:bg-black-50">
                        <td className="py-2 px-3 font-medium text-black-700">
                          Ch {chapter.index}: {chapter.title}
                        </td>
                        {sectionAnalyticsData?.sections?.map(sec => {
                          const cp = sec.chapterProgress.find(c => c.chapterIndex === chapter.index);
                          const pct = cp?.percent || 0;
                          return (
                            <td key={sec.id} className="text-center py-2 px-3">
                              <span className={`
                                px-2 py-0.5 rounded-full text-xs font-medium
                                ${pct >= 80 ? 'bg-green-100 text-green-700' : 
                                  pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-black-100 text-black-600'}
                              `}>
                                {pct}%
                              </span>
                            </td>
                          );
                        })}
                        <td className="text-center py-2 px-3">
                          <span className={`
                            px-2 py-0.5 rounded-full text-xs font-semibold
                            ${chapter.avgCompletion >= 80 ? 'bg-green-100 text-green-700' : 
                              chapter.avgCompletion >= 50 ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-black-100 text-black-600'}
                          `}>
                            {chapter.avgCompletion}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
