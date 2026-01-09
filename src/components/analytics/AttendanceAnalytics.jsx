import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Users, Award, AlertTriangle, CheckCircle2, Grid3X3
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

/**
 * AttendanceAnalytics - Attendance-specific analytics for embedding in Attendance tab
 */
export default function AttendanceAnalytics({
  students = [],
  attendanceByDate = {},
  compact = false,
}) {
  // Calculate detailed attendance analytics
  const analytics = useMemo(() => {
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

    const atRisk = studentAttendance.filter(s => s.percent < 75 && s.total > 0);
    const perfectAttendance = studentAttendance.filter(s => s.percent === 100 && s.total > 0);
    const avgPercent = dailyData.length 
      ? Math.round(dailyData.reduce((s, d) => s + d.percent, 0) / dailyData.length)
      : 0;

    // Trend
    const recent = dailyData.slice(-7);
    const previous = dailyData.slice(-14, -7);
    const recentAvg = recent.length ? recent.reduce((s, d) => s + d.percent, 0) / recent.length : 0;
    const prevAvg = previous.length ? previous.reduce((s, d) => s + d.percent, 0) / previous.length : 0;
    const trend = recentAvg - prevAvg;

    return { dailyData, studentAttendance, atRisk, perfectAttendance, avgPercent, totalDays: dates.length, trend, totalStudents };
  }, [attendanceByDate, students]);

  // Heatmap data
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

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Avg Attendance" value={`${analytics.avgPercent}%`} icon={Users} trend={analytics.trend} color="indigo" />
        <StatCard label="Days Recorded" value={analytics.totalDays} icon={Grid3X3} color="slate" />
        <StatCard label="At Risk" value={analytics.atRisk.length} icon={AlertTriangle} color="red" />
        <StatCard label="Perfect" value={analytics.perfectAttendance.length} icon={Award} color="green" />
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-neutral-800">Attendance Trend</h3>
            <p className="text-xs text-neutral-500">Last 14 days</p>
          </div>
          {analytics.trend !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              analytics.trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {analytics.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(analytics.trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div className={compact ? 'h-32' : 'h-48'}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.dailyData}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }} formatter={(value) => [`${value}%`, 'Attendance']} />
              <Area type="monotone" dataKey="percent" stroke="#6366f1" strokeWidth={2} fill="url(#attGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Student Heatmap */}
      {!compact && heatmapData.matrix.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-neutral-800">Student Attendance Heatmap</h3>
            <p className="text-xs text-neutral-500">Last 14 days – Sorted by attendance (lowest first)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-neutral-500 pb-3 pr-4 sticky left-0 bg-white">Student</th>
                  {heatmapData.dates.map((date) => (
                    <th key={date} className="text-center text-[10px] font-medium text-neutral-500 pb-3 px-1">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' })}
                    </th>
                  ))}
                  <th className="text-center text-xs font-medium text-neutral-500 pb-3 pl-3">%</th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.matrix.slice(0, 15).map((row, rowIdx) => (
                  <motion.tr key={row.studentId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: rowIdx * 0.02 }}>
                    <td className="text-sm text-neutral-700 py-1.5 pr-4 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${row.percent < 75 ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-600'}`}>
                          {row.name?.charAt(0) || 'S'}
                        </div>
                        <span className="truncate max-w-[80px]">{row.name}</span>
                      </div>
                    </td>
                    {row.cells.map((cell, cellIdx) => (
                      <td key={cellIdx} className="py-1.5 px-1">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-medium ${
                          cell.status === 'present' ? 'bg-green-500 text-white' : cell.status === 'absent' ? 'bg-red-500 text-white' : 'bg-neutral-100 text-neutral-400'
                        }`} title={`${row.name} - ${cell.shortDate}: ${cell.status}`}>
                          {cell.status === 'present' ? '✓' : cell.status === 'absent' ? '✗' : '-'}
                        </div>
                      </td>
                    ))}
                    <td className="py-1.5 pl-3 text-center">
                      <span className={`text-sm font-bold ${row.percent >= 90 ? 'text-green-600' : row.percent >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {row.percent}%
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500" /><span className="text-xs text-neutral-600">Present</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500" /><span className="text-xs text-neutral-600">Absent</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-neutral-100" /><span className="text-xs text-neutral-600">No Record</span></div>
          </div>
        </div>
      )}

      {/* At Risk Students */}
      {analytics.atRisk.length > 0 && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Students at Risk ({analytics.atRisk.length})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {analytics.atRisk.slice(0, 6).map(student => (
              <div key={student.studentId} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-200">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-red-600">{student.name?.charAt(0) || 'S'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{student.name}</p>
                  <p className="text-xs text-red-600">{student.percent}% attendance</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Perfect Attendance */}
      {analytics.perfectAttendance.length > 0 && (
        <div className="bg-green-50 rounded-2xl border border-green-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Perfect Attendance ({analytics.perfectAttendance.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analytics.perfectAttendance.slice(0, 12).map(student => (
              <div key={student.studentId} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="text-sm text-neutral-700">{student.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, trend, color, alert }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    slate: 'bg-neutral-50 text-neutral-600',
  };
  return (
    <div className={`p-4 rounded-xl border ${alert ? 'border-red-200 bg-red-50/50' : 'border-neutral-200 bg-white'}`}>
      <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex items-end gap-2">
        <p className="text-xl font-bold text-neutral-800">{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={`text-xs font-medium mb-0.5 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  );
}
