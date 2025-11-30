import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useTeacher } from "../../context/TeacherContext";
import { getProgressComparisonData } from "../../data/analyticsData";

const targetColor = "#6366f1";
const barColor = "#0ea5e9";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const completed = payload.find((entry) => entry.dataKey === "completed")?.value ?? 0;
  const target = payload.find((entry) => entry.dataKey === "target")?.value ?? 0;
  const variance = completed - target;
  return (
    <div className="rounded-md border border-black-200 bg-white px-3 py-2 text-xs text-black-600 shadow-md">
      <p className="font-semibold text-black-700">Section {label}</p>
      <p>Progress: {Math.round(completed)}%</p>
      <p>Benchmark: {Math.round(target)}%</p>
      <p className={variance >= 0 ? "text-green-600" : "text-red-500"}>
        Variance: {variance >= 0 ? "+" : ""}{Math.round(variance)}%
      </p>
    </div>
  );
}

export default function ProgressComparisonChart({ courseId }) {
  const { teacher } = useTeacher();

  const rows = useMemo(() => getProgressComparisonData(courseId, teacher) || [], [courseId, teacher]);

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-black-300 bg-white/60 p-6 text-sm text-black-500">
        Add sections to this course to view comparisons.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-black-800">Progress vs Benchmark</h3>
        <span className="text-xs uppercase tracking-wide text-black-400">Target 75%</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={rows} margin={{ top: 12, right: 24, bottom: 12, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="sectionId" stroke="#94a3b8" tickFormatter={(value) => `Sec ${value}`} />
          <YAxis domain={[0, 100]} stroke="#94a3b8" tickFormatter={(value) => `${value}%`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={75} stroke={targetColor} strokeDasharray="4 4" />
          <Bar dataKey="completed" barSize={28} fill={barColor} radius={[6, 6, 0, 0]} />
          <Line type="monotone" dataKey="target" stroke={targetColor} strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
