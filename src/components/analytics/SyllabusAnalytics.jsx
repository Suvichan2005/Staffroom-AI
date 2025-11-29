import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, Clock, Layers, Target } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

/**
 * SyllabusAnalytics - Syllabus-specific analytics for embedding in Syllabus tab
 */
export default function SyllabusAnalytics({
  syllabus = null,
  topicProgress = {},
  progressPercent = 0,
  compact = false,
}) {
  // Calculate syllabus analytics
  const analytics = useMemo(() => {
    if (!syllabus?.chapters) return null;

    const chapters = syllabus.chapters.map(chapter => {
      const topics = chapter.subTopics || [];
      const done = topics.filter(t => topicProgress?.[chapter.index]?.topics?.[t.index] === 'done').length;
      const inProgress = topics.filter(t => topicProgress?.[chapter.index]?.topics?.[t.index] === 'in-progress').length;
      const notStarted = topics.length - done - inProgress;
      const percent = topics.length ? Math.round((done / topics.length) * 100) : 0;
      
      return { index: chapter.index, title: chapter.title, topics: topics.length, done, inProgress, notStarted, percent };
    });

    const totalTopics = chapters.reduce((s, c) => s + c.topics, 0);
    const completedTopics = chapters.reduce((s, c) => s + c.done, 0);
    const inProgressTopics = chapters.reduce((s, c) => s + c.inProgress, 0);
    const behindSchedule = chapters.filter(c => c.percent < 50);
    const nearCompletion = chapters.filter(c => c.percent >= 80 && c.percent < 100);
    const completed = chapters.filter(c => c.percent === 100);

    return { chapters, totalTopics, completedTopics, inProgressTopics, behindSchedule, nearCompletion, completed };
  }, [syllabus, topicProgress]);

  // Distribution data
  const distributionData = useMemo(() => {
    if (!analytics) return [];
    const notStarted = analytics.totalTopics - analytics.completedTopics - analytics.inProgressTopics;
    return [
      { name: 'Completed', value: analytics.completedTopics, color: '#10b981' },
      { name: 'In Progress', value: analytics.inProgressTopics, color: '#f59e0b' },
      { name: 'Not Started', value: notStarted, color: '#e2e8f0' },
    ].filter(d => d.value > 0);
  }, [analytics]);

  // Chapter bar data
  const chapterBarData = useMemo(() => {
    if (!analytics) return [];
    return analytics.chapters.map(ch => ({
      name: `Ch ${ch.index}`,
      fullName: ch.title,
      done: ch.done,
      inProgress: ch.inProgress,
      notStarted: ch.notStarted,
      percent: ch.percent,
    }));
  }, [analytics]);

  if (!analytics) return <p className="text-slate-500 text-center py-8">No syllabus data available</p>;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Overall Progress" value={`${progressPercent}%`} icon={Target} color="indigo" />
        <StatCard label="Topics Done" value={`${analytics.completedTopics}/${analytics.totalTopics}`} icon={CheckCircle2} color="emerald" />
        <StatCard label="Chapters Done" value={analytics.completed.length} icon={BookOpen} color="purple" />
        <StatCard label="Behind Schedule" value={analytics.behindSchedule.length} icon={Clock} color={analytics.behindSchedule.length > 0 ? 'rose' : 'slate'} alert={analytics.behindSchedule.length > 0} />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Distribution Pie */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Topic Distribution</h3>
          <div className="flex items-center gap-6">
            <div className="h-36 w-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} dataKey="value">
                    {distributionData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {distributionData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <span className="text-sm text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chapter Progress Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Chapter Progress</h3>
          <div className={compact ? 'h-32' : 'h-48'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chapterBarData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} width={40} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-lg text-sm">
                        <p className="font-medium text-slate-800">{data.fullName}</p>
                        <p className="text-emerald-600">{data.done} done</p>
                        <p className="text-amber-600">{data.inProgress} in progress</p>
                        <p className="text-slate-400">{data.notStarted} pending</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="percent" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Topic Matrix */}
      {!compact && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">Topic Progress Matrix</h3>
            <p className="text-xs text-slate-500">Visual overview of all topics</p>
          </div>
          <div className="space-y-4">
            {analytics.chapters.map((chapter, chapterIdx) => (
              <motion.div
                key={chapter.index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: chapterIdx * 0.05 }}
                className="p-4 rounded-xl bg-slate-50"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600">{chapter.index}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800">{chapter.title}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{chapter.done}/{chapter.topics} done</span>
                      <span>•</span>
                      <span className={chapter.percent >= 80 ? 'text-emerald-600 font-medium' : chapter.percent < 50 ? 'text-rose-600 font-medium' : ''}>
                        {chapter.percent}%
                      </span>
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div className="bg-emerald-500 transition-all" style={{ width: `${(chapter.done / chapter.topics) * 100}%` }} />
                    <div className="bg-amber-400 transition-all" style={{ width: `${(chapter.inProgress / chapter.topics) * 100}%` }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Behind Schedule Alert */}
      {analytics.behindSchedule.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Chapters Behind Schedule</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analytics.behindSchedule.map(ch => (
              <div key={ch.index} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-600">{ch.index}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{ch.title}</p>
                  <p className="text-xs text-amber-600">{ch.percent}% complete • {ch.done}/{ch.topics} topics</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, alert }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    slate: 'bg-slate-50 text-slate-600',
  };
  return (
    <div className={`p-4 rounded-xl border ${alert ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-white'}`}>
      <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
