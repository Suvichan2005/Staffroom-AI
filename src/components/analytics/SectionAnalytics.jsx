import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Users, BookOpen, Calendar, Award,
  AlertTriangle, CheckCircle2, Clock, Target, BarChart3, PieChart,
  Grid3X3, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, Tooltip, Cell, PieChart as RechartsPie, Pie
} from 'recharts';

/**
 * SectionAnalytics - Comprehensive analytics for a class section
 * Shows attendance trends, syllabus progress, student performance, and heatmaps
 */
export default function SectionAnalytics({
  classId,
  students = [],
  attendanceByDate = {},
  syllabus = null,
  topicProgress = {},
  progressPercent = 0,
}) {
  const [activeView, setActiveView] = useState('overview');

  // Calculate detailed attendance analytics
  const attendanceAnalytics = useMemo(() => {
    const dates = Object.keys(attendanceByDate).sort();
    const totalStudents = students.length;
    
    // Daily attendance data for chart
    const dailyData = dates.slice(-14).map(date => {
      const records = attendanceByDate[date] || [];
      const present = records.filter(r => r.status === 'present').length;
      const percent = records.length ? Math.round((present / records.length) * 100) : 0;
      return {
        date: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date,
        present,
        absent: records.length - present,
        percent,
        total: records.length,
      };
    });

    // Student-wise attendance
    const studentAttendance = students.map(student => {
      const logs = Object.values(attendanceByDate).flat().filter(r => r.studentId === student.studentId);
      const present = logs.filter(l => l.status === 'present').length;
      const total = logs.length;
      const percent = total ? Math.round((present / total) * 100) : 0;
      return { ...student, present, total, percent };
    }).sort((a, b) => b.percent - a.percent);

    // Students at risk (below 75%)
    const atRisk = studentAttendance.filter(s => s.percent < 75 && s.total > 0);
    
    // Perfect attendance
    const perfectAttendance = studentAttendance.filter(s => s.percent === 100 && s.total > 0);
    
    // Average attendance
    const avgPercent = dailyData.length 
      ? Math.round(dailyData.reduce((s, d) => s + d.percent, 0) / dailyData.length)
      : 0;

    // Attendance trend
    const recent = dailyData.slice(-7);
    const previous = dailyData.slice(-14, -7);
    const recentAvg = recent.length ? recent.reduce((s, d) => s + d.percent, 0) / recent.length : 0;
    const prevAvg = previous.length ? previous.reduce((s, d) => s + d.percent, 0) / previous.length : 0;
    const trend = recentAvg - prevAvg;

    return {
      dailyData,
      studentAttendance,
      atRisk,
      perfectAttendance,
      avgPercent,
      totalDays: dates.length,
      trend,
      totalStudents,
    };
  }, [attendanceByDate, students]);

  // Calculate syllabus analytics
  const syllabusAnalytics = useMemo(() => {
    if (!syllabus?.chapters) return null;

    const chapters = syllabus.chapters.map(chapter => {
      const topics = chapter.subTopics || [];
      const done = topics.filter(t => topicProgress?.[chapter.index]?.topics?.[t.index] === 'done').length;
      const inProgress = topics.filter(t => topicProgress?.[chapter.index]?.topics?.[t.index] === 'in-progress').length;
      const notStarted = topics.length - done - inProgress;
      const percent = topics.length ? Math.round((done / topics.length) * 100) : 0;
      
      return {
        index: chapter.index,
        title: chapter.title,
        topics: topics.length,
        done,
        inProgress,
        notStarted,
        percent,
      };
    });

    const totalTopics = chapters.reduce((s, c) => s + c.topics, 0);
    const completedTopics = chapters.reduce((s, c) => s + c.done, 0);
    const inProgressTopics = chapters.reduce((s, c) => s + c.inProgress, 0);

    const behindSchedule = chapters.filter(c => c.percent < 50);
    const nearCompletion = chapters.filter(c => c.percent >= 80 && c.percent < 100);

    return {
      chapters,
      totalTopics,
      completedTopics,
      inProgressTopics,
      behindSchedule,
      nearCompletion,
      overallPercent: progressPercent,
    };
  }, [syllabus, topicProgress, progressPercent]);

  // Distribution data for pie chart
  const distributionData = useMemo(() => {
    if (!syllabusAnalytics) return [];
    return [
      { name: 'Completed', value: syllabusAnalytics.completedTopics, color: '#10b981' },
      { name: 'In Progress', value: syllabusAnalytics.inProgressTopics, color: '#f59e0b' },
      { name: 'Not Started', value: syllabusAnalytics.totalTopics - syllabusAnalytics.completedTopics - syllabusAnalytics.inProgressTopics, color: '#e2e8f0' },
    ].filter(d => d.value > 0);
  }, [syllabusAnalytics]);

  // Heatmap data - student x date attendance matrix
  const heatmapData = useMemo(() => {
    const dates = Object.keys(attendanceByDate).sort().slice(-14);
    const matrix = students.map(student => {
      const row = {
        studentId: student.studentId,
        name: student.name || `Student ${student.studentId}`,
        cells: dates.map(date => {
          const record = (attendanceByDate[date] || []).find(r => r.studentId === student.studentId);
          return {
            date,
            status: record?.status || 'none',
            shortDate: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
          };
        })
      };
      const total = row.cells.filter(c => c.status !== 'none').length;
      const present = row.cells.filter(c => c.status === 'present').length;
      row.percent = total > 0 ? Math.round((present / total) * 100) : 0;
      return row;
    }).sort((a, b) => a.percent - b.percent);
    
    return { dates, matrix };
  }, [attendanceByDate, students]);

  // Topic heatmap data
  const topicHeatmapData = useMemo(() => {
    if (!syllabus?.chapters) return null;
    
    return syllabus.chapters.map(chapter => ({
      index: chapter.index,
      title: chapter.title,
      topics: (chapter.subTopics || []).map(topic => ({
        index: topic.index,
        title: topic.title,
        status: topicProgress?.[chapter.index]?.topics?.[topic.index] || 'not-started'
      }))
    }));
  }, [syllabus, topicProgress]);

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'heatmap', label: 'Attendance Heatmap', icon: Grid3X3 },
          { id: 'topics', label: 'Topic Matrix', icon: Layers },
        ].map(view => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeView === view.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'bg-white text-black-600 border border-black-200 hover:bg-black-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Overview View */}
      {activeView === 'overview' && (
        <>
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={BookOpen}
              label="Syllabus Progress"
              value={`${progressPercent}%`}
              subtext={`${syllabusAnalytics?.completedTopics || 0}/${syllabusAnalytics?.totalTopics || 0} topics`}
              color="indigo"
            />
            <MetricCard
              icon={Users}
              label="Avg Attendance"
              value={`${attendanceAnalytics.avgPercent}%`}
              subtext={`${attendanceAnalytics.totalDays} days recorded`}
              color="green"
              trend={attendanceAnalytics.trend}
            />
            <MetricCard
              icon={AlertTriangle}
              label="Students at Risk"
              value={attendanceAnalytics.atRisk.length}
              subtext="Below 75% attendance"
              color="red"
            />
            <MetricCard
              icon={Award}
              label="Perfect Attendance"
              value={attendanceAnalytics.perfectAttendance.length}
              subtext={`of ${attendanceAnalytics.totalStudents} students`}
              color="yellow"
            />
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Attendance Trend Chart */}
            <div className="bg-white rounded-2xl border border-black-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-black-800">Attendance Trend</h3>
                  <p className="text-xs text-black-500">Last 14 days</p>
                </div>
                {attendanceAnalytics.trend !== 0 && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    attendanceAnalytics.trend > 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {attendanceAnalytics.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(attendanceAnalytics.trend).toFixed(1)}%
                  </div>
                )}
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceAnalytics.dailyData}>
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(value) => [`${value}%`, 'Attendance']}
                    />
                    <Area type="monotone" dataKey="percent" stroke="#6366f1" strokeWidth={2} fill="url(#attendanceGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Syllabus Progress Distribution */}
            <div className="bg-white rounded-2xl border border-black-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-black-800">Topic Progress</h3>
                  <p className="text-xs text-black-500">Distribution by status</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="h-40 w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={distributionData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {distributionData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                        <span className="text-sm text-black-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-black-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chapter Progress */}
          {syllabusAnalytics && (
            <div className="bg-white rounded-2xl border border-black-200 p-5">
              <h3 className="font-semibold text-black-800 mb-4">Chapter-wise Progress</h3>
              <div className="space-y-3">
                {syllabusAnalytics.chapters.map((chapter, index) => (
                  <motion.div
                    key={chapter.index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-indigo-600">{chapter.index}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-black-700 truncate">{chapter.title}</p>
                        <span className="text-xs font-semibold text-black-600">{chapter.percent}%</span>
                      </div>
                      <div className="h-2 bg-black-100 rounded-full overflow-hidden">
                        <div className="h-full flex">
                          <div className="bg-green-500 transition-all" style={{ width: `${(chapter.done / chapter.topics) * 100}%` }} />
                          <div className="bg-yellow-400 transition-all" style={{ width: `${(chapter.inProgress / chapter.topics) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-black-500">{chapter.done}/{chapter.topics} topics done</span>
                        {chapter.inProgress > 0 && (
                          <span className="text-[10px] text-yellow-600">{chapter.inProgress} in progress</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Students at Risk */}
          {attendanceAnalytics.atRisk.length > 0 && (
            <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Students Needing Attention</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {attendanceAnalytics.atRisk.slice(0, 6).map(student => (
                  <div key={student.studentId} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-200">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-red-600">{student.name?.charAt(0) || 'S'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black-800 truncate">{student.name}</p>
                      <p className="text-xs text-red-600">{student.percent}% attendance</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Perfect Attendance */}
          {attendanceAnalytics.perfectAttendance.length > 0 && (
            <div className="bg-green-50 rounded-2xl border border-green-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Perfect Attendance</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {attendanceAnalytics.perfectAttendance.slice(0, 10).map(student => (
                  <div key={student.studentId} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-green-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-sm text-black-700">{student.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Attendance Heatmap View */}
      {activeView === 'heatmap' && (
        <div className="bg-white rounded-2xl border border-black-200 p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-black-800">Student Attendance Heatmap</h3>
            <p className="text-xs text-black-500">Last 14 days • Sorted by attendance (lowest first)</p>
          </div>
          
          {heatmapData.matrix.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-black-500 pb-3 pr-4 sticky left-0 bg-white">Student</th>
                    {heatmapData.dates.map((date, i) => (
                      <th key={date} className="text-center text-[10px] font-medium text-black-500 pb-3 px-1">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' })}
                      </th>
                    ))}
                    <th className="text-center text-xs font-medium text-black-500 pb-3 pl-3">%</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.matrix.map((row, rowIdx) => (
                    <motion.tr 
                      key={row.studentId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: rowIdx * 0.02 }}
                    >
                      <td className="text-sm text-black-700 py-1.5 pr-4 sticky left-0 bg-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            row.percent < 75 ? 'bg-red-100 text-red-600' : 'bg-black-100 text-black-600'
                          }`}>
                            {row.name?.charAt(0) || 'S'}
                          </div>
                          <span className="truncate max-w-[100px]">{row.name}</span>
                        </div>
                      </td>
                      {row.cells.map((cell, cellIdx) => (
                        <td key={cellIdx} className="py-1.5 px-1">
                          <div 
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium transition-transform hover:scale-110 cursor-default ${
                              cell.status === 'present' 
                                ? 'bg-green-500 text-white' 
                                : cell.status === 'absent' 
                                  ? 'bg-red-500 text-white'
                                  : 'bg-black-100 text-black-400'
                            }`}
                            title={`${row.name} - ${cell.shortDate}: ${cell.status === 'none' ? 'No record' : cell.status}`}
                          >
                            {cell.status === 'present' ? '✓' : cell.status === 'absent' ? '✗' : '-'}
                          </div>
                        </td>
                      ))}
                      <td className="py-1.5 pl-3 text-center">
                        <span className={`text-sm font-bold ${
                          row.percent >= 90 ? 'text-green-600' :
                          row.percent >= 75 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {row.percent}%
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Grid3X3 className="w-12 h-12 text-black-300 mx-auto mb-3" />
              <p className="text-black-500">No attendance data available</p>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-black-100">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-green-500" />
              <span className="text-xs text-black-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-red-500" />
              <span className="text-xs text-black-600">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-black-100" />
              <span className="text-xs text-black-600">No Record</span>
            </div>
          </div>
        </div>
      )}

      {/* Topic Matrix View */}
      {activeView === 'topics' && (
        <div className="bg-white rounded-2xl border border-black-200 p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-black-800">Topic Progress Matrix</h3>
            <p className="text-xs text-black-500">Visual overview of all topics across chapters</p>
          </div>
          
          {topicHeatmapData ? (
            <div className="space-y-4">
              {topicHeatmapData.map((chapter, chapterIdx) => (
                <motion.div
                  key={chapter.index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: chapterIdx * 0.1 }}
                  className="p-4 rounded-xl bg-black-50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-indigo-600">{chapter.index}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-black-800">{chapter.title}</h4>
                      <p className="text-[10px] text-black-500">
                        {chapter.topics.filter(t => t.status === 'done').length}/{chapter.topics.length} topics completed
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {chapter.topics.map((topic, topicIdx) => (
                      <div
                        key={topicIdx}
                        className={`group relative px-3 py-2 rounded-lg text-xs font-medium transition-transform hover:scale-105 cursor-default ${
                          topic.status === 'done'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : topic.status === 'in-progress'
                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                              : 'bg-white text-black-500 border border-black-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {topic.status === 'done' && <CheckCircle2 className="w-3 h-3" />}
                          {topic.status === 'in-progress' && <Clock className="w-3 h-3" />}
                          {topic.index}. {topic.title.length > 20 ? topic.title.slice(0, 20) + '...' : topic.title}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {topic.title}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black-900" />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Layers className="w-12 h-12 text-black-300 mx-auto mb-3" />
              <p className="text-black-500">No syllabus data available</p>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-black-100">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-green-100 border border-green-200" />
              <span className="text-xs text-black-600">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-yellow-100 border border-yellow-200" />
              <span className="text-xs text-black-600">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-white border border-black-200" />
              <span className="text-xs text-black-600">Not Started</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtext, color, trend, alert }) {
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
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-black-800">{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={`text-xs font-medium mb-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-xs text-black-500 mt-1">{label}</p>
      {subtext && <p className="text-[10px] text-black-400">{subtext}</p>}
    </motion.div>
  );
}
