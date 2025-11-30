import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { PageShell } from "../components/layout";
import { HeatmapGrid } from "../components/charts";
import { getHODOverview, teacherData, students, getAttendanceForClass } from "../data/dummyData";
import { getHeatmapMatrix } from "../data/analyticsData";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell
} from "recharts";
import { useTeacher } from "../context/TeacherContext";
import { 
  TrendingUp, TrendingDown, Users, BookOpen, Calendar, Award,
  AlertTriangle, Target, Sparkles, ChevronRight, CheckCircle2
} from "lucide-react";

export default function HODDashboard() {
  const teacherCtx = useTeacher();
  const activeTeacher = teacherCtx?.teacher || teacherData;
  const defaultCourseId = activeTeacher?.courses?.[0]?.id;
  const [activeCourseId, setActiveCourseId] = useState(defaultCourseId);
  const [activeTab, setActiveTab] = useState("overview");
  const overview = useMemo(
    () => getHODOverview(activeCourseId, activeTeacher),
    [activeCourseId, activeTeacher]
  );
  const matrix = useMemo(
    () => getHeatmapMatrix(activeCourseId, activeTeacher),
    [activeCourseId, activeTeacher]
  );
  const [hoveredCell, setHoveredCell] = useState(null);
  const [viewLevel, setViewLevel] = useState("chapter");

  useEffect(() => {
    if (!activeCourseId && defaultCourseId) {
      setActiveCourseId(defaultCourseId);
    }
  }, [defaultCourseId, activeCourseId]);

  // Calculate aggregate metrics
  const aggregateMetrics = useMemo(() => {
    if (!overview) return null;
    
    const sections = overview.sections || [];
    const avgProgress = sections.length 
      ? Math.round(sections.reduce((s, sec) => s + sec.progressPercent, 0) / sections.length)
      : 0;
    
    // Find best and worst performing sections
    const sortedSections = [...sections].sort((a, b) => b.progressPercent - a.progressPercent);
    const bestSection = sortedSections[0];
    const worstSection = sortedSections[sortedSections.length - 1];
    
    // Calculate parity score (how close are sections to each other)
    const maxDiff = bestSection && worstSection 
      ? bestSection.progressPercent - worstSection.progressPercent 
      : 0;
    const parityScore = 100 - Math.min(maxDiff * 2, 100);
    
    // Total students
    const totalStudents = sections.reduce((s, sec) => {
      const sectionStudents = students.filter(stu => stu.classId === sec.sectionId);
      return s + sectionStudents.length;
    }, 0);

    // Chapters that need attention (below 40% across all sections)
    const chaptersNeedingAttention = [];
    sections.forEach(section => {
      section.chapterBreakdown?.forEach(chapter => {
        if (chapter.percent < 40) {
          const existing = chaptersNeedingAttention.find(c => c.chapterIndex === chapter.chapterIndex);
          if (!existing) {
            chaptersNeedingAttention.push({ ...chapter, sections: [section.sectionId] });
          } else {
            existing.sections.push(section.sectionId);
          }
        }
      });
    });

    return {
      avgProgress,
      bestSection,
      worstSection,
      parityScore,
      totalStudents,
      totalSections: sections.length,
      chaptersNeedingAttention,
    };
  }, [overview]);

  // Radar chart data for section comparison
  const radarData = useMemo(() => {
    if (!overview?.sections) return [];
    
    // Get all chapter indices
    const allChapters = new Set();
    overview.sections.forEach(sec => {
      sec.chapterBreakdown?.forEach(ch => allChapters.add(ch.chapterIndex));
    });
    
    return Array.from(allChapters).sort((a, b) => a - b).map(chIndex => {
      const point = { chapter: `Ch ${chIndex}` };
      overview.sections.forEach(sec => {
        const chapter = sec.chapterBreakdown?.find(ch => ch.chapterIndex === chIndex);
        point[sec.sectionId] = chapter?.percent || 0;
      });
      return point;
    });
  }, [overview]);

  if (!overview) {
    return (
      <PageShell width="5xl">
        <div className="sc-card">
          <h1 className="text-2xl font-semibold">HOD Overview</h1>
          <p className="mt-2 text-black-500">No courses configured yet.</p>
        </div>
      </PageShell>
    );
  }

  const handleGenerateExamTopics = () => {
    const suggestions = overview.sections
      .flatMap((section) => section.chapterBreakdown)
      .filter((chapter) => chapter.percent >= 60)
      .slice(0, 3)
      .map((chapter) => `${chapter.chapterTitle} (${chapter.percent}%)`)
      .join(", ");
    toast.success(`Suggested focus: ${suggestions || "add more coverage first"}`);
  };

  const sectionColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];

  return (
    <PageShell width="6xl" className="pt-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-black-500">HOD Overview</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-black-800">{overview.subject} Department</h1>
          <p className="text-sm text-black-500 mt-1">
            Monitor section parity, progress, and teaching insights
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeCourseId}
            onChange={(event) => setActiveCourseId(event.target.value)}
            className="border border-black-200 rounded-xl px-4 py-2.5 text-sm bg-white"
          >
            {overview.filters.subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      {aggregateMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard 
            icon={Target} 
            label="Avg Progress" 
            value={`${aggregateMetrics.avgProgress}%`}
            subtext={`Across ${aggregateMetrics.totalSections} sections`}
            color="indigo"
          />
          <MetricCard 
            icon={Users} 
            label="Total Students" 
            value={aggregateMetrics.totalStudents}
            subtext="In this subject"
            color="green"
          />
          <MetricCard 
            icon={Award} 
            label="Section Parity" 
            value={`${aggregateMetrics.parityScore}%`}
            subtext={aggregateMetrics.parityScore >= 80 ? "Good alignment" : "Needs attention"}
            color={aggregateMetrics.parityScore >= 80 ? "blue" : "yellow"}
          />
          <MetricCard 
            icon={AlertTriangle} 
            label="Chapters Behind" 
            value={aggregateMetrics.chaptersNeedingAttention.length}
            subtext="Below 40% progress"
            color="red"
            alert={aggregateMetrics.chaptersNeedingAttention.length > 0}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 text-sm font-medium mb-6 overflow-x-auto pb-2">
        {[
          { id: "overview", label: "Overview" },
          { id: "sections", label: "Sections" },
          { id: "heatmap", label: "Heatmap" },
          { id: "exams", label: "Exam Planning" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                : "bg-white text-black-600 border border-black-200 hover:bg-black-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            {/* Progress Comparison Chart */}
            <div className="bg-white rounded-2xl border border-black-200 p-5">
              <h3 className="font-semibold text-black-800 mb-4">Section Progress Comparison</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={overview.sections.map((section, i) => ({
                      name: section.sectionId,
                      percent: section.progressPercent,
                      fill: sectionColors[i % sectionColors.length],
                    }))}
                    layout="vertical"
                  >
                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={60} />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Progress']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="percent" radius={[0, 8, 8, 0]}>
                      {overview.sections.map((_, i) => (
                        <Cell key={i} fill={sectionColors[i % sectionColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar Chart for Chapter Comparison */}
            {radarData.length > 0 && (
              <div className="bg-white rounded-2xl border border-black-200 p-5">
                <h3 className="font-semibold text-black-800 mb-4">Chapter Coverage by Section</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="chapter" stroke="#64748b" fontSize={11} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                      {overview.sections.map((sec, i) => (
                        <Radar
                          key={sec.sectionId}
                          name={sec.sectionId}
                          dataKey={sec.sectionId}
                          stroke={sectionColors[i % sectionColors.length]}
                          fill={sectionColors[i % sectionColors.length]}
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      ))}
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {overview.sections.map((sec, i) => (
                    <div key={sec.sectionId} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ background: sectionColors[i % sectionColors.length] }}
                      />
                      <span className="text-sm text-black-600">{sec.sectionId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Best & Worst Sections */}
            {aggregateMetrics && (
              <div className="bg-white rounded-2xl border border-black-200 p-5">
                <h3 className="font-semibold text-black-800 mb-4">Section Highlights</h3>
                <div className="space-y-4">
                  {aggregateMetrics.bestSection && (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-green-700">Top Performer</span>
                      </div>
                      <p className="text-lg font-bold text-green-800">{aggregateMetrics.bestSection.sectionId}</p>
                      <p className="text-sm text-green-600">{aggregateMetrics.bestSection.progressPercent}% complete</p>
                    </div>
                  )}
                  {aggregateMetrics.worstSection && aggregateMetrics.totalSections > 1 && (
                    <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-yellow-600" />
                        <span className="text-xs font-medium text-yellow-700">Needs Support</span>
                      </div>
                      <p className="text-lg font-bold text-yellow-800">{aggregateMetrics.worstSection.sectionId}</p>
                      <p className="text-sm text-yellow-600">{aggregateMetrics.worstSection.progressPercent}% complete</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Teacher Insights */}
            <div className="bg-white rounded-2xl border border-black-200 p-5">
              <h3 className="font-semibold text-black-800 mb-4">Teacher Insights</h3>
              <div className="space-y-3">
                <InsightRow 
                  label="Syllabus Updates" 
                  value={overview.teacherInsights.syllabusUpdateRate} 
                />
                <InsightRow 
                  label="Attendance Submission" 
                  value={overview.teacherInsights.attendanceSubmissionRate} 
                />
                <InsightRow 
                  label="Resource Sharing" 
                  value={overview.teacherInsights.resourceSharing} 
                />
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold">AI Recommendations</h3>
              </div>
              <ul className="space-y-3">
                {aggregateMetrics?.parityScore < 80 && (
                  <li className="flex items-start gap-2 p-3 bg-white/10 rounded-xl text-sm">
                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Schedule alignment meeting to reduce section gap
                  </li>
                )}
                {aggregateMetrics?.chaptersNeedingAttention.length > 0 && (
                  <li className="flex items-start gap-2 p-3 bg-white/10 rounded-xl text-sm">
                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Focus on {aggregateMetrics.chaptersNeedingAttention[0]?.chapterTitle}
                  </li>
                )}
                <li className="flex items-start gap-2 p-3 bg-white/10 rounded-xl text-sm">
                  <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Review exam schedule for coverage alignment
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sections Tab */}
      {activeTab === "sections" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {overview.sections.map((section, idx) => (
            <motion.div 
              key={section.sectionId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl border border-black-200 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-black-500">Section</p>
                  <h2 className="text-xl font-bold text-black-800">{section.sectionId}</h2>
                  <p className="text-xs text-black-500 mt-0.5">
                    {section.schedules?.join(" • ") || "Schedule TBC"}
                  </p>
                </div>
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ 
                    background: `conic-gradient(${sectionColors[idx % sectionColors.length]} ${section.progressPercent * 3.6}deg, #e2e8f0 0deg)` 
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                    <span className="text-sm font-bold text-black-800">{section.progressPercent}%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                {section.chapterBreakdown?.slice(0, 4).map((chapter) => (
                  <div key={chapter.chapterIndex}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-black-600 truncate flex-1">
                        {chapter.chapterIndex}. {chapter.chapterTitle}
                      </span>
                      <span className="text-black-500 ml-2">{chapter.percent}%</span>
                    </div>
                    <div className="h-2 bg-black-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${chapter.percent}%`,
                          background: sectionColors[idx % sectionColors.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
                {section.chapterBreakdown?.length > 4 && (
                  <p className="text-xs text-black-400 text-center pt-2">
                    +{section.chapterBreakdown.length - 4} more chapters
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Heatmap Tab */}
      {activeTab === "heatmap" && (
        <div className="bg-white rounded-2xl border border-black-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-black-800">Syllabus Heatmap</h3>
              <p className="text-xs text-black-500">
                Hover cells to inspect completion by chapter and section
              </p>
            </div>
            <div className="text-xs text-black-500 min-w-[180px]">
              {hoveredCell ? (
                <div className="text-right">
                  <p className="font-medium text-black-700">{hoveredCell.sectionId}</p>
                  <p>{hoveredCell.chapterTitle}</p>
                  <p className="text-indigo-600 font-semibold">{hoveredCell.percent}% done</p>
                </div>
              ) : (
                <p className="text-right">Hover a cell to view detail</p>
              )}
            </div>
          </div>
          <HeatmapGrid matrix={matrix} onHover={setHoveredCell} />
        </div>
      )}

      {/* Exams Tab */}
      {activeTab === "exams" && (
        <div className="bg-white rounded-2xl border border-black-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-black-800">Exam Planning</h3>
            <button
              onClick={handleGenerateExamTopics}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Generate Exam Topics
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-black-200">
                  <th className="text-left py-3 px-4 text-xs uppercase text-black-500 font-semibold">Section</th>
                  <th className="text-left py-3 px-4 text-xs uppercase text-black-500 font-semibold">Chapter</th>
                  <th className="text-left py-3 px-4 text-xs uppercase text-black-500 font-semibold">Coverage</th>
                  <th className="text-left py-3 px-4 text-xs uppercase text-black-500 font-semibold">Exam Ready</th>
                </tr>
              </thead>
              <tbody>
                {overview.sections.flatMap((section, sIdx) =>
                  section.chapterBreakdown?.map((chapter, cIdx) => (
                    <tr 
                      key={`${section.sectionId}-${chapter.chapterIndex}`} 
                      className="border-b border-black-50 hover:bg-black-50"
                    >
                      {cIdx === 0 && (
                        <td 
                          className="py-3 px-4 font-medium text-black-700"
                          rowSpan={section.chapterBreakdown.length}
                        >
                          <span 
                            className="inline-block w-2 h-2 rounded-full mr-2" 
                            style={{ background: sectionColors[sIdx % sectionColors.length] }}
                          />
                          {section.sectionId}
                        </td>
                      )}
                      <td className="py-3 px-4 text-black-600">{chapter.chapterTitle}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-black-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${chapter.percent}%`,
                                background: chapter.percent >= 60 ? '#10b981' : chapter.percent >= 40 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                          <span className="text-xs text-black-500">{chapter.percent}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {chapter.percent >= 60 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Not Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function MetricCard({ icon: Icon, label, value, subtext, color, alert }) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-2xl border ${alert ? 'border-red-200 bg-red-50/50' : 'border-black-200 bg-white'}`}
    >
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-black-800">{value}</p>
      <p className="text-xs text-black-500 mt-1">{label}</p>
      {subtext && <p className="text-[10px] text-black-400">{subtext}</p>}
    </motion.div>
  );
}

function InsightRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-black-600">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-black-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${value}%`,
              background: value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
        <span className="text-xs font-medium text-black-700 w-10 text-right">{value}%</span>
      </div>
    </div>
  );
}
