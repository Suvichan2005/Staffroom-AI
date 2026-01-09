import { useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import { useTeacher } from "../../context/TeacherContext";
import { getSubtopicStackedBarData } from "../../data/analyticsData";

const personaMultipliers = {
  teacher: 1,
  hod: 0.95,
  admin: 0.9,
};

const strokeColor = "#6366f1";
const fillColor = "#6366f1";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { payload: row } = payload[0];
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 shadow-md">
      <p className="font-semibold text-neutral-700">{row.chapter}</p>
      <p>Average coverage: {Math.round(row.value)}%</p>
      <p className="text-neutral-400">Variance indicator: {Math.round(row.variance)}%</p>
    </div>
  );
}

export default function SubtopicRadarChart({ courseId }) {
  const { teacher, persona } = useTeacher();

  const data = useMemo(() => {
    const raw = getSubtopicStackedBarData(courseId, teacher) || [];
    if (!raw.length) return [];

    const chapterAccumulator = new Map();
    raw.forEach((entry) => {
      const sectionKeys = Object.keys(entry).filter(
        (key) => !["topic", "topicKey", "chapterTitle", "pages"].includes(key)
      );
      const average = sectionKeys.length
        ? sectionKeys.reduce((sum, key) => sum + (entry[key] || 0), 0) / sectionKeys.length
        : 0;
      const current = chapterAccumulator.get(entry.chapterTitle) || { value: 0, count: 0 };
      chapterAccumulator.set(entry.chapterTitle, {
        value: current.value + average,
        count: current.count + 1,
      });
    });

    const multiplier = personaMultipliers[persona] ?? 1;

    return Array.from(chapterAccumulator.entries()).map(([chapter, { value, count }]) => {
      const average = count ? value / count : 0;
      const scaled = Math.min(100, average * multiplier);
      return {
        chapter,
        value: Number(scaled.toFixed(1)),
        variance: Number((average - 75).toFixed(1)),
      };
    });
  }, [courseId, teacher, persona]);

  if (!data.length) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white/60 p-6 text-sm text-neutral-500">
        Radar insights appear once progress data is available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-800">Chapter Radar Snapshot</h3>
        <span className="text-xs uppercase tracking-wide text-neutral-400">Persona: {persona}</span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart outerRadius="70%" data={data} margin={{ top: 16, bottom: 16 }}>
          <PolarGrid stroke="#cbd5f5" />
          <PolarAngleAxis dataKey="chapter" tick={{ fill: "#475569", fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Radar dataKey="value" stroke={strokeColor} fill={fillColor} fillOpacity={0.25} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
