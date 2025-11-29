import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";
import { useTeacher } from "../../context/TeacherContext";
import { getSubtopicStackedBarData } from "../../data/analyticsData";

const delayedColor = "#ef4444";
const cautionColor = "#f97316";
const progressColor = "#22c55e";

const formatPercent = (value = 0) => `${Math.round(value)}%`;

const computeFill = (rawPercent = 0) => {
  if (rawPercent >= 80) return progressColor;
  if (rawPercent >= 55) return "#eab308";
  if (rawPercent >= 35) return cautionColor;
  return delayedColor;
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const { dataKey, payload: row, value } = payload[0];
  const details = row?.__meta?.[dataKey];
  if (!details) return null;
  const { topic, pages, rawPercent, pagesDone, chapterTitle } = details;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-700">{topic}</p>
      <p className="text-slate-500">Chapter: {chapterTitle}</p>
      <p className="mt-1 text-slate-600">
        Section {label}: {Math.round(rawPercent)}% | {pagesDone} / {pages} pages
      </p>
      <p className="mt-1 text-slate-400">Stack contribution: {formatPercent(value)} of bar</p>
    </div>
  );
}

export default function SubtopicStackedBar({ courseId }) {
  const { teacher } = useTeacher();

  const { rows, topics, sectionOrder } = useMemo(() => {
    const raw = getSubtopicStackedBarData(courseId, teacher) || [];
    if (!raw.length) return { rows: [], topics: [], sectionOrder: [] };

    const sections = Object.keys(raw[0] || {})
      .filter((key) => !["topic", "topicKey", "chapterTitle", "pages"].includes(key));

    const normalizedRows = sections.map((sectionId) => {
      const row = { section: sectionId, __meta: {} };
      const topicCount = raw.length || 1;
      raw.forEach((item) => {
        const normalizedValue = (item[sectionId] || 0) / topicCount;
        row[item.topicKey] = Number(normalizedValue.toFixed(2));
        const pages = item.pages || 0;
        const rawPercent = item[sectionId] || 0;
        row.__meta[item.topicKey] = {
          topic: item.topic,
          chapterTitle: item.chapterTitle,
          pages,
          rawPercent,
          pagesDone: Math.round((pages * rawPercent) / 100),
        };
      });
      const worstTopic = Math.min(
        ...raw.map((item) => row.__meta[item.topicKey]?.rawPercent ?? 100)
      );
      row.__worst = worstTopic;
      return row;
    });

    normalizedRows.sort((a, b) => (a.__worst ?? 100) - (b.__worst ?? 100));

    return {
      rows: normalizedRows,
      topics: raw.map((item) => ({ key: item.topicKey, label: item.topic })),
      sectionOrder: normalizedRows.map((row) => row.section),
    };
  }, [courseId, teacher]);

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500">
        Subtopic analytics will populate once syllabus progress is captured.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">Section-wise Subtopic Coverage</h3>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {sectionOrder.length} sections | {topics.length} subtopics
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280 + Math.max(0, rows.length - 3) * 40}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 12, right: 24, bottom: 12, left: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={formatPercent} stroke="#94a3b8" />
          <YAxis
            type="category"
            dataKey="section"
            tickFormatter={(value, index) => {
              const worst = rows[index]?.__worst ?? 100;
              return worst < 45 ? `! ${value}` : value;
            }}
            stroke="#94a3b8"
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 12 }} formatter={(value) => value.replace(/^[0-9]+\./, "")} />
          {topics.map((topic, idx) => (
            <Bar
              key={topic.key}
              dataKey={topic.key}
              stackId="coverage"
              name={topic.label}
              radius={idx === topics.length - 1 ? [4, 4, 0, 0] : 0}
            >
              {rows.map((row, rowIndex) => {
                const cellMeta = row.__meta[topic.key];
                const fill = computeFill(cellMeta?.rawPercent);
                return <Cell key={`${topic.key}-${rowIndex}`} fill={fill} />;
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500">
        Sections prefixed with <span className="font-semibold text-rose-500">!</span> have subtopics under 45%
        completion and should be prioritised before the next assessment.
      </p>
    </div>
  );
}
